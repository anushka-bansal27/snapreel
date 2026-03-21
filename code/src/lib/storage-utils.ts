
'use server';
import fs from 'fs/promises';
import { join } from 'path';
import { getStorageSettings } from './data.actions';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

/**
 * Utility to delete a file from the active storage provider.
 * Supports local filesystem and S3-compatible providers.
 */
export async function deleteFile(fileUrl: string | null | undefined) {
    if (!fileUrl) return;

    try {
        const storageSettings = await getStorageSettings();
        const activeProvider = storageSettings?.activeProvider || 'local';

        // 1. Handle Local Filesystem Deletion
        if (fileUrl.startsWith('/uploads/')) {
            const relativePath = fileUrl.replace('/uploads/', '');
            const filePath = join(process.cwd(), 'public', 'uploads', relativePath);
            
            try {
                await fs.unlink(filePath);
                console.log(`Successfully deleted local file: ${filePath}`);
            } catch (err: any) {
                if (err.code !== 'ENOENT') {
                    console.error(`Error deleting local file ${filePath}:`, err);
                }
            }
            return;
        }

        // 2. Handle Bunny.net Deletion
        const config = storageSettings?.[activeProvider as keyof typeof storageSettings] as any;
        if (activeProvider === 'bunny' && config) {
            let pullZone = config.pullZoneUrl || '';
            if (pullZone) {
                if (!/^https?:\/\//i.test(pullZone)) {
                    pullZone = `https://${pullZone}`;
                }
                if (!pullZone.endsWith('/')) {
                    pullZone += '/';
                }
            }
            if (pullZone && (fileUrl.startsWith('http') || fileUrl.includes(pullZone))) {
                let key = fileUrl.replace(pullZone, '');
                if (key.startsWith('/')) {
                    key = key.substring(1);
                }
                
                const storageZoneName = config.storageZoneName;
                const apiKey = config.apiKey;
                const region = config.region || '';
                
                let host = 'storage.bunnycdn.com';
                if (region && region.toLowerCase() !== 'de') {
                    host = `${region.toLowerCase()}.storage.bunnycdn.com`;
                }
                
                const url = `https://${host}/${storageZoneName}/${key}`;
                
                try {
                    const response = await fetch(url, {
                        method: 'DELETE',
                        headers: {
                            'AccessKey': apiKey
                        }
                    });
                    
                    if (response.ok) {
                        console.log(`Successfully deleted file from bunny.net: ${key}`);
                    } else {
                        const errMsg = await response.text();
                        console.error(`Failed to delete file from bunny.net: ${response.statusText} (${errMsg})`);
                    }
                } catch (deleteErr: any) {
                    console.error(`Failed to send delete request to bunny.net:`, deleteErr.message);
                }
            }
            return;
        }

        // 3. Handle Cloud Storage Deletion (S3, DigitalOcean, B2, GCS)
        if (config && config.bucket && (fileUrl.startsWith('http') || fileUrl.includes(config.bucket))) {
            // Extract key from URL
            // Example: https://bucket.s3.region.amazonaws.com/videos/file.mp4 -> videos/file.mp4
            const url = new URL(fileUrl);
            let key = url.pathname.substring(1); // Remove leading slash
            
            // If it's DigitalOcean/S3 path style, key might be after the bucket name in pathname
            if (key.startsWith(`${config.bucket}/`)) {
                key = key.replace(`${config.bucket}/`, '');
            }

            let endpoint = config.endpoint;
            if (!endpoint && activeProvider === 'gcs') {
                endpoint = 'storage.googleapis.com';
            }

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

            const clientConfig: any = {
                credentials: { 
                    accessKeyId: config.accessKeyId || config.applicationKeyId, 
                    secretAccessKey: config.secretAccessKey || config.applicationKey 
                },
                region: region || 'us-east-1',
            };

            if (endpoint) {
                clientConfig.endpoint = endpoint.startsWith('http') ? endpoint : `https://${endpoint}`;
                clientConfig.forcePathStyle = true;
            }

            const s3 = new S3Client(clientConfig);
            await s3.send(new DeleteObjectCommand({
                Bucket: config.bucket,
                Key: key,
            }));
            console.log(`Successfully deleted cloud file: ${key} from ${activeProvider}`);
        }
    } catch (error) {
        console.error(`Failed to delete file ${fileUrl}:`, error);
    }
}
