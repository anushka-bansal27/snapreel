import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { join } from 'path';
import { stat } from 'fs/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const filePath = path.join('/');
  
  if (!filePath || filePath.includes('..')) {
    return new NextResponse('Invalid path', { status: 400 });
  }

  if (filePath.startsWith('videos/') || filePath.startsWith('/videos/')) {
    const lower = filePath.toLowerCase();
    const isAllowedDirect = 
        lower.endsWith('.vtt') || 
        lower.endsWith('.srt') || 
        lower.endsWith('.m3u8') || 
        lower.endsWith('.ts') || 
        lower.endsWith('.m4s') || 
        lower.endsWith('.mpd');
    if (!isAllowedDirect) {
      return new NextResponse('Access Denied: Direct file access is forbidden', { status: 403 });
    }
  }

  const fullPath = join(process.cwd(), 'public', 'uploads', filePath);

  try {
    const stats = await stat(fullPath);
    const extension = filePath.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream';
    const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ts': 'video/mp2t',
        'm3u8': 'application/vnd.apple.mpegurl',
        'mpd': 'application/dash+xml',
        'm4s': 'video/iso.segment',
        'vtt': 'text/vtt',
        'srt': 'text/plain',
    };
    if (extension in mimeTypes) {
        contentType = mimeTypes[extension];
    }

    const range = request.headers.get('range');
    if (range && stats.size > 0) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      const stream = fs.createReadStream(fullPath, { start, end });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunksize),
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Cache-Control': 'public, max-age=31536000, immutable',
        }
      });
    }

    const stream = fs.createReadStream(fullPath);
    return new NextResponse(stream as any, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stats.size),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      }
    });
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return new NextResponse('File not found', { status: 404 });
    }
    if (process.env.NODE_ENV !== 'production') {
      console.error(`Error serving file ${filePath}:`, error);
    }
    return new NextResponse('Internal server error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    },
  });
}
