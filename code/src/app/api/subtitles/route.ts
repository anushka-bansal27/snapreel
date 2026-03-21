import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const file = searchParams.get('file');
    if (!file) return new NextResponse('Missing file parameter', { status: 400 });
    
    if (!file.endsWith('.vtt') && !file.endsWith('.srt')) {
        return new NextResponse('Only subtitles allowed', { status: 403 });
    }
    const cleanName = file.split('/').pop()?.split('\\').pop() || '';
    if (!cleanName) return new NextResponse('Invalid file name', { status: 400 });

    let fullPath = join(process.cwd(), 'public', 'uploads', 'videos', cleanName);
    if (!fs.existsSync(fullPath)) {
        fullPath = join(process.cwd(), 'public', 'uploads', 'subtitles', cleanName);
    }
    if (!fs.existsSync(fullPath)) {
        return new NextResponse('Subtitle not found', { status: 404 });
    }

    try {
        let content = fs.readFileSync(fullPath, 'utf8');
        const trimmed = content.trim();
        if (!trimmed.startsWith('WEBVTT')) {
            // Normalize SRT timestamps (comma to dot: 00:00:01,000 -> 00:00:01.000) and prepend WEBVTT header
            const converted = trimmed.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (_match, p1, p2) => `${p1}.${p2}`);
            content = `WEBVTT\n\n${converted}`;
        }
        return new NextResponse(content, {
            headers: {
                'Content-Type': 'text/vtt; charset=utf-8',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, max-age=86400'
            }
        });
    } catch (e: any) {
        return new NextResponse('Failed to read subtitle', { status: 500 });
    }
}
