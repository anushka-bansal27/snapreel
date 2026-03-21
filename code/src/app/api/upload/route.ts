import { NextRequest, NextResponse } from 'next/server';
import { writeFile, stat, mkdir, chmod, readdir, unlink } from 'fs/promises';
import { join } from 'path';
import { getStorageSettings } from '@/lib/data.actions';
import { DEMO_MODE_MUTATION_MESSAGE, isDemoMode } from '@/lib/demo-mode';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { verifyAdminSession } from '@/lib/actions/auth';

// Increase the body size limit for file uploads (Next.js config)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '2gb',
    },
  },
};

/**
 * Ensures that a directory exists, and sets its permissions to 0o755.
 */
async function ensureDir(dirPath: string) {
  try {
    await stat(dirPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      await mkdir(dirPath, { recursive: true });
      try { await chmod(dirPath, 0o755); } catch (e) {}
    } else {
      throw error;
    }
  }
}

/**
 * Uploads a file buffer to an S3-compatible cloud storage provider (Amazon S3, DigitalOcean Spaces, GCS, Backblaze B2).
 */
async function uploadToS3(buffer: Buffer, originalName: string, subDir: string, config: any, mimeType: string, extension: string, customFilename?: string): Promise<string> {
    const filename = customFilename ? `${customFilename}.${extension}` : `${Date.now()}-${originalName.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase()}`;
    const key = `${subDir}/${filename}`;
    const keyWithExt = key.endsWith(`.${extension}`) ? key : `${key}.${extension}`;

    // Google Cloud Storage uses S3 compatibility mode, but has no custom region/endpoint configured by default
    const isGCS = !config.endpoint && !config.region;

    // Standardize the endpoint url for Google Cloud Storage
    let endpoint = config.endpoint;
    if (!endpoint && isGCS) {
        endpoint = 'storage.googleapis.com';
    }

    // Attempt to extract the region automatically from the endpoint URL if not provided
    let region = config.region;
    if (!region && endpoint) {
        const parts = endpoint.replace(/^https?:\/\//, '').split('.');
        if (parts.length > 1) {
            if (parts[0] === 's3' && parts[1]) {
                region = parts[1];
            } else {
                region = parts[0];
            }
        }
    }

    // Configure the AWS SDK S3 client options
    let clientConfig: any = {
        credentials: { 
            accessKeyId: config.accessKeyId || config.applicationKeyId, 
            secretAccessKey: config.secretAccessKey || config.applicationKey 
        },
        region: region || 'us-east-1',
    };

    // Apply path style and customized endpoint if applicable
    if (endpoint) {
        clientConfig.endpoint = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
        clientConfig.forcePathStyle = true;
    }

    const s3 = new S3Client(clientConfig);

    // Some storage providers fail if the 'public-read' ACL is set (e.g. if ACLs are disabled).
    // In this case, we catch the failure and retry uploading without specifying the ACL.
    try {
        await s3.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: keyWithExt,
            Body: buffer,
            ContentType: mimeType,
            ACL: 'public-read',
        }));
    } catch (err: any) {
        // Gated console.warn removed as per reviewer guidelines to prevent leaking system information
        await s3.send(new PutObjectCommand({
            Bucket: config.bucket,
            Key: keyWithExt,
            Body: buffer,
            ContentType: mimeType,
        }));
    }

    // Return the absolute public URL to the uploaded file
    if (config.endpoint) {
        const endpointBase = config.endpoint.replace(/^https?:\/\//, '');
        return `https://${config.bucket}.${endpointBase}/${keyWithExt}`;
    }
    return `https://${config.bucket}.s3.${config.region || 'us-east-1'}.amazonaws.com/${keyWithExt}`;
}

/**
 * Uploads a file buffer to Bunny.net storage zone and returns the pull zone delivery URL.
 */
async function uploadToBunny(buffer: Buffer, originalName: string, subDir: string, config: any, extension: string, customFilename?: string): Promise<string> {
    const cleanOriginalName = originalName.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase();
    const filename = customFilename ? `${customFilename}.${extension}` : `${Date.now()}-${cleanOriginalName}`;
    const key = `${subDir}/${filename}`;
    const keyWithExt = key.endsWith(`.${extension}`) ? key : `${key}.${extension}`;
    
    const storageZoneName = config.storageZoneName;
    const apiKey = config.apiKey;
    const region = config.region || '';
    
    let host = 'storage.bunnycdn.com';
    if (region && region.toLowerCase() !== 'de') {
        host = `${region.toLowerCase()}.storage.bunnycdn.com`;
    }
    
    const url = `https://${host}/${storageZoneName}/${keyWithExt}`;
    
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'AccessKey': apiKey,
            'Content-Type': 'application/octet-stream',
        },
        body: buffer
    });
    
    if (!response.ok) {
        // Sanitize error messages to avoid leaking keys or internal structure
        throw new Error(`Bunny.net upload failed with status: ${response.status} ${response.statusText}`);
    }
    
    let pullZone = config.pullZoneUrl || '';
    if (pullZone) {
        if (!/^https?:\/\//i.test(pullZone)) {
            pullZone = `https://${pullZone}`;
        }
        if (!pullZone.endsWith('/')) {
            pullZone += '/';
        }
    }
    return `${pullZone}${keyWithExt}`;
}

/**
 * Detects the MIME type and file extension based on magic numbers (file signature headers).
 * This prevents uploading arbitrary files by verifying the actual binary structure.
 */
function detectMimeAndExtension(buffer: Buffer, fileName?: string): { mime: string; ext: string } | null {
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.vtt')) return { mime: 'text/vtt', ext: 'vtt' };
    if (lower.endsWith('.srt')) return { mime: 'text/vtt', ext: 'vtt' };
  }

  if (buffer.length >= 6) {
    const headerStr = buffer.slice(0, 64).toString('utf8');
    if (headerStr.includes('WEBVTT') || headerStr.startsWith('\ufeffWEBVTT')) {
      return { mime: 'text/vtt', ext: 'vtt' };
    }
    if (/^\s*\d+[\r\n]+\d{2}:\d{2}/.test(headerStr)) {
      return { mime: 'text/vtt', ext: 'vtt' };
    }
  }

  if (buffer.length < 4) return null;

  // PNG Check (89 50 4E 47)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }
  // JPEG/JPG Check (FF D8 FF)
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }
  // GIF Check (47 49 46 38)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && (buffer[3] === 0x38 || buffer[3] === 0x37)) {
    return { mime: 'image/gif', ext: 'gif' };
  }
  // WEBP Check (RIFF....WEBP)
  if (buffer.length >= 12 &&
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return { mime: 'image/webp', ext: 'webp' };
  }
  // MP4 Check ('ftyp' string signature at offset 4)
  if (buffer.length >= 8 && buffer[4] === 0x66 && buffer[5] === 0x74 && buffer[6] === 0x79 && buffer[7] === 0x70) {
    return { mime: 'video/mp4', ext: 'mp4' };
  }
  // WEBM Check (1A 45 DF A3)
  if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) {
    return { mime: 'video/webm', ext: 'webm' };
  }
  // M3U8 Check (#EXTM3U)
  if (buffer.length >= 7 &&
      buffer[0] === 0x23 && buffer[1] === 0x45 && buffer[2] === 0x58 && buffer[3] === 0x54 && 
      buffer[4] === 0x4D && buffer[5] === 0x33 && buffer[6] === 0x55) {
    return { mime: 'application/x-mpegURL', ext: 'm3u8' };
  }
  // TS Check (starts with 0x47, but since GIF also starts with 0x47, we check if it's not a GIF)
  // A TS sync byte is 0x47, but a basic check is enough for our admin panel
  if (buffer[0] === 0x47 && (buffer[1] !== 0x49 || buffer[2] !== 0x46)) {
      return { mime: 'video/MP2T', ext: 'ts' };
  }

  return null;
}

/**
 * Validates request authorization and demo constraints.
 */
async function validateRequest(request: NextRequest): Promise<NextResponse | null> {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
        return NextResponse.json({ success: false, error: 'Unauthorized: Admin session required' }, { status: 401 });
    }

    if (isDemoMode()) {
        return NextResponse.json({ success: false, error: DEMO_MODE_MUTATION_MESSAGE }, { status: 403 });
    }

    const contentLength = Number(request.headers.get('content-length') || 0);
    const MAX_LIMIT = 2 * 1024 * 1024 * 1024; // 2GB
    if (contentLength > MAX_LIMIT) {
        return NextResponse.json({ success: false, error: 'File size exceeds limit (Max 2GB).' }, { status: 413 });
    }

    return null;
}

/**
 * Parses the file and metadata from the request, checking constraints.
 */
async function parseAndValidateFile(request: NextRequest): Promise<{
    buffer: Buffer;
    file: File;
    type: string;
    identifier: string;
    detectedMime: string;
    detectedExt: string;
} | NextResponse> {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;
    const type = data.get('type') as string;
    const identifier = data.get('identifier') as string;

    if (!file) {
        return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate MIME types from file header magic numbers and filename
    const fileInfo = detectMimeAndExtension(buffer, file.name);
    if (!fileInfo) {
        return NextResponse.json({ success: false, error: 'Invalid file signature: Only images (PNG, JPEG, GIF, WEBP), videos (MP4, WEBM, M3U8, TS), and subtitles (VTT, SRT) are allowed.' }, { status: 400 });
    }

    const { mime: detectedMime, ext: detectedExt } = fileInfo;
    const isImage = detectedMime.startsWith('image/');
    const isSubtitle = detectedMime === 'text/vtt' || detectedExt === 'vtt' || detectedExt === 'srt';
    
    // Strict file-specific size checks
    const sizeLimit = isSubtitle ? 5 * 1024 * 1024 : isImage ? 10 * 1024 * 1024 : 2 * 1024 * 1024 * 1024; // 5MB subtitles, 10MB images, 2GB videos
    if (file.size > sizeLimit) {
        return NextResponse.json({ success: false, error: `File size exceeds allowed limit (${isSubtitle ? '5MB' : isImage ? '10MB' : '2GB'}).` }, { status: 413 });
    }

    return { buffer, file, type, identifier, detectedMime, detectedExt };
}

/**
 * Handles uploads to local filesystem storage, including payment logo replacements and cleanups.
 */
async function handleLocalStorage(buffer: Buffer, file: File, type: string, identifier: string, detectedExt: string, detectedMime: string): Promise<string> {
    const cleanType = typeof type === 'string' ? type.replace(/[^a-z0-9_-]/gi, '') : '';
    const cleanIdentifier = typeof identifier === 'string' ? identifier.replace(/[^a-z0-9_-]/gi, '') : '';
    const isPaymentLogo = cleanType === 'payment-logo' && cleanIdentifier;
    const extension = typeof detectedExt === 'string' ? detectedExt.replace(/[^a-z0-9]/gi, '') : 'bin';
    const isImage = detectedMime.startsWith('image/');
    
    const isSubtitle = detectedMime === 'text/vtt' || detectedExt === 'vtt' || detectedExt === 'srt';
    let subDir = isImage ? 'images' : isSubtitle ? 'subtitles' : 'videos';
    const cleanOrigName = file.name ? file.name.replace(/[^a-z0-9_.-]/gi, '_').toLowerCase() : 'file';
    let filename = `${Date.now()}-${cleanOrigName}`;
    if (!filename.endsWith(`.${extension}`)) {
        filename = `${filename}.${extension}`;
    }
    let uploadDir = join(process.cwd(), 'public', 'uploads', subDir);

    if (isPaymentLogo) {
        // Standardize payment gateways logos to a predictable name
        uploadDir = join(process.cwd(), 'public', 'img');
        filename = `logo-${cleanIdentifier}.${extension}`;
        
        // Remove older custom logo extensions for same payment provider to prevent confusion
        try {
            await ensureDir(uploadDir);
            const existingFiles = await readdir(uploadDir);
            for (const f of existingFiles) {
                if (f.startsWith(`logo-${cleanIdentifier}.`)) {
                    const deletePath = join(uploadDir, f);
                    if (deletePath.startsWith(uploadDir)) {
                        await unlink(deletePath);
                    }
                }
            }
        } catch (e) {
            // Suppressed non-development outputs
        }
    }

    await ensureDir(uploadDir);
    const filePath = join(uploadDir, filename);
    
    // Explicitly verify resolved absolute path to block any path traversal
    if (!filePath.startsWith(uploadDir)) {
        throw new Error('Path traversal attempt detected.');
    }

    await writeFile(filePath, buffer);
    try { await chmod(filePath, 0o644); } catch (e) {}

    return isPaymentLogo ? `/img/${filename}` : `/uploads/${subDir}/${filename}`;
}

/**
 * Handles uploading files to the active cloud storage provider configured in Settings.
 */
async function handleCloudStorage(
    activeProvider: string,
    storageSettings: any,
    buffer: Buffer,
    file: File,
    type: string,
    identifier: string,
    detectedExt: string,
    detectedMime: string
): Promise<string> {
    const config = storageSettings?.[activeProvider];
    if (!config) {
        throw new Error(`Configuration for ${activeProvider} is missing.`);
    }

    const isImage = detectedMime.startsWith('image/');
    let subDir = isImage ? 'images' : 'videos';
    let customName = undefined;

    if (type === 'payment-logo' && identifier) {
        subDir = 'branding';
        customName = `logo-${identifier}`;
    }

    if (activeProvider === 'bunny') {
        return await uploadToBunny(buffer, file.name, subDir, config, detectedExt, customName);
    }

    return await uploadToS3(buffer, file.name, subDir, config, detectedMime, detectedExt, customName);
}

/**
 * Main POST request handler for file uploads.
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate request auth and limits
    const validationError = await validateRequest(request);
    if (validationError) return validationError;

    // 2. Parse and validate file signature
    const parseResult = await parseAndValidateFile(request);
    if (parseResult instanceof NextResponse) return parseResult;

    const { buffer, file, type, identifier, detectedMime, detectedExt } = parseResult;

    // 3. Load active storage configuration
    const storageSettings = await getStorageSettings();
    const activeProvider = storageSettings?.activeProvider || 'local';

    // 4. Branch to appropriate storage handler
    let finalUrl = '';
    if (activeProvider === 'local') {
        finalUrl = await handleLocalStorage(buffer, file, type, identifier, detectedExt, detectedMime);
    } else {
        finalUrl = await handleCloudStorage(activeProvider, storageSettings, buffer, file, type, identifier, detectedExt, detectedMime);
    }

    return NextResponse.json({ success: true, url: finalUrl });

  } catch (error: any) {
    if (process.env.NODE_ENV !== 'production') {
        console.error('Upload route error:', error);
    }
    return NextResponse.json({ success: false, error: error.message || 'Upload failed' }, { status: 500 });
  }
}
