import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { Readable } from 'stream';
import { join } from 'path';
import { getPluginsSettings } from '@/lib/data.actions';
import { decryptPath } from '@/lib/crypto';
import { getVideoSecret } from '@/lib/video-secret';

function streamFile(path: string, options?: any): ReadableStream {
    const readStream = fs.createReadStream(path, { highWaterMark: 1024 * 1024, ...options });
    if (typeof Readable.toWeb === 'function') {
        return Readable.toWeb(readStream) as unknown as ReadableStream;
    }
    return new ReadableStream({
        start(controller) {
            readStream.on('data', (chunk: any) => controller.enqueue(new Uint8Array(chunk)));
            readStream.on('end', () => controller.close());
            readStream.on('error', (error: NodeJS.ErrnoException) => controller.error(error));
        },
        cancel() {
            readStream.destroy();
        },
    });
}

function getTimeKeys(period: string, now: number): string[] {
    let current = '';
    let previous = '';
    
    switch(period) {
        case '1h': {
            const h = Math.floor(now / 3600000);
            current = String(h);
            previous = String(h - 1);
            break;
        }
        case '12h': {
            const h = Math.floor(now / 43200000);
            current = String(h);
            previous = String(h - 1);
            break;
        }
        case '24h': {
            const date = new Date(now);
            current = date.toISOString().split('T')[0];
            const prevDate = new Date(now - 24 * 60 * 60 * 1000);
            previous = prevDate.toISOString().split('T')[0];
            break;
        }
        case '1w': {
            const w = Math.floor(now / 604800000);
            current = String(w);
            previous = String(w - 1);
            break;
        }
        case '1mo': {
            const date = new Date(now);
            current = `${date.getFullYear()}-${date.getMonth()}`;
            const prevDate = new Date(date.getFullYear(), date.getMonth() - 1, 1);
            previous = `${prevDate.getFullYear()}-${prevDate.getMonth()}`;
            break;
        }
        default: {
            const date = new Date(now);
            current = date.toISOString().split('T')[0];
            const prevDate = new Date(now - 24 * 60 * 60 * 1000);
            previous = prevDate.toISOString().split('T')[0];
        }
    }
    return [current, previous];
}

/**
 * This API route acts as a secure proxy for uploaded/cloud video files.
 * It decrypts the secure parameter and streams the content.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const encryptedKey = searchParams.get('v');

    if (!encryptedKey) {
        return new NextResponse('Missing parameter', { status: 400 });
    }

    let secret = '';
    try {
        secret = await getVideoSecret();
    } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('Could not load video signing secret:', error);
        }
        return new NextResponse('Internal Server Error: video security is unavailable.', { status: 500 });
    }
    let decrypted = '';
    try {
        decrypted = decryptPath(encryptedKey, secret);
    } catch (err) {
        return new NextResponse('Access Denied: Invalid security key', { status: 403 });
    }
    
    const parts = decrypted.split('|');
    if (parts.length !== 2) {
        return new NextResponse('Access Denied: Invalid security payload', { status: 403 });
    }
    
    const [filePath, embeddedTimeKey] = parts;

    // Fetch protection settings from MongoDB
    const pluginsSettings = await getPluginsSettings();
    const isProtectionEnabled = pluginsSettings?.videoProtectionEnabled !== false;

    if (isProtectionEnabled) {
        const period = pluginsSettings?.videoRotationPeriod || '24h';
        const [currentKey, previousKey] = getTimeKeys(period, Date.now());
        
        if (embeddedTimeKey !== currentKey && embeddedTimeKey !== previousKey) {
            return new NextResponse('Access Denied: Security key expired', { status: 403 });
        }
    }

    const isRemote = filePath.startsWith('http://') || filePath.startsWith('https://');
    
    if (isRemote) {
        try {
            const range = request.headers.get('range');
            const headers: Record<string, string> = {
                'accept-encoding': 'identity',
                'user-agent': request.headers.get('user-agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'referer': request.headers.get('referer') || request.nextUrl.origin || 'http://localhost:3000'
            };
            if (range) {
                headers['range'] = range;
            }
            
            const response = await fetch(filePath, { 
                headers,
                cache: 'no-store',
                next: { revalidate: 0 },
                redirect: 'follow'
            });
            
            const responseHeaders = new Headers();
            const contentType = response.headers.get('content-type') || response.headers.get('Content-Type');
            responseHeaders.set('Content-Type', contentType && contentType !== 'application/octet-stream' ? contentType : 'video/mp4');
            responseHeaders.set('Accept-Ranges', 'bytes');
            
            const contentRange = response.headers.get('content-range') || response.headers.get('Content-Range');
            if (contentRange) {
                responseHeaders.set('Content-Range', contentRange);
            }
            const contentLength = response.headers.get('content-length') || response.headers.get('Content-Length');
            if (contentLength) {
                responseHeaders.set('Content-Length', contentLength);
            }
            const etag = response.headers.get('etag') || response.headers.get('ETag');
            if (etag) {
                responseHeaders.set('ETag', etag);
            }
            const lastMod = response.headers.get('last-modified') || response.headers.get('Last-Modified');
            if (lastMod) {
                responseHeaders.set('Last-Modified', lastMod);
            }
            responseHeaders.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
            responseHeaders.set('Content-Disposition', 'inline');
            responseHeaders.set('Access-Control-Allow-Origin', '*');
            responseHeaders.set('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
            
            return new NextResponse(response.body, {
                status: response.status,
                headers: responseHeaders
            });
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                console.error('Error streaming cloud video:', error);
            }
            return new NextResponse('Failed to retrieve video stream', { status: 502 });
        }
    } else {
        // Sanitize path (must be within uploads/videos)
        const fileName = filePath.split('/').pop();
        if (!fileName) return new NextResponse('Invalid file', { status: 400 });

        const fullPath = join(process.cwd(), 'public', 'uploads', 'videos', fileName);

        if (!fs.existsSync(fullPath)) {
            return new NextResponse('File not found', { status: 404 });
        }

        // Handle range requests for video seeking and instant fast-start streaming
        const stat = fs.statSync(fullPath);
        const fileSize = stat.size;
        const range = request.headers.get('range');
        
        let contentType = 'video/mp4';
        if (fullPath.endsWith('.webm')) contentType = 'video/webm';
        else if (fullPath.endsWith('.m3u8')) contentType = 'application/x-mpegURL';
        else if (fullPath.endsWith('.ts')) contentType = 'video/MP2T';

        if (range) {
            let start = 0;
            let end = fileSize - 1;

            const matches = range.match(/bytes=(\d*)-(\d*)/);
            if (matches) {
                const startStr = matches[1];
                const endStr = matches[2];

                if (startStr === "" && endStr !== "") {
                    // Suffix range request (e.g. bytes=-1048576) - critical for MP4 moov atom / fast start
                    const suffixLength = parseInt(endStr, 10);
                    if (!isNaN(suffixLength) && suffixLength > 0) {
                        start = Math.max(0, fileSize - suffixLength);
                        end = fileSize - 1;
                    }
                } else if (startStr !== "" && endStr === "") {
                    // Open-ended range request (e.g. bytes=0-)
                    const parsedStart = parseInt(startStr, 10);
                    if (!isNaN(parsedStart)) {
                        start = parsedStart;
                        end = fileSize - 1;
                    }
                } else if (startStr !== "" && endStr !== "") {
                    // Exact range request (e.g. bytes=0-1024)
                    const parsedStart = parseInt(startStr, 10);
                    const parsedEnd = parseInt(endStr, 10);
                    if (!isNaN(parsedStart) && !isNaN(parsedEnd)) {
                        start = parsedStart;
                        end = Math.min(parsedEnd, fileSize - 1);
                    }
                }
            }


            // Ensure start and end are within valid bounds
            if (isNaN(start) || isNaN(end) || start >= fileSize || start > end) {
                return new NextResponse('Range Not Satisfiable', {
                    status: 416,
                    headers: {
                        'Content-Range': `bytes */${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges'
                    }
                });
            }

            const chunksize = (end - start) + 1;
            const fileStream = streamFile(fullPath, { start, end });
            
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize.toString(),
                'Content-Type': contentType,
                'Content-Disposition': 'inline',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges'
            };

            return new NextResponse(fileStream, { status: 206, headers: head });
        } else {
            const head = {
                'Content-Length': fileSize.toString(),
                'Content-Type': contentType,
                'Content-Disposition': 'inline',
                'Accept-Ranges': 'bytes',
                'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges'
            };
            const fileStream = streamFile(fullPath);
            return new NextResponse(fileStream, { status: 200, headers: head });
        }
    }
}
