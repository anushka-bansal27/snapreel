import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic HLS Virtual Playlist Generator
 * 
 * Takes a direct MPEG-TS (.ts) video URL and generates an on-the-fly HLS (.m3u8) playlist.
 * This allows browser video engines (Hls.js and Safari native HLS) to demux and play .ts video files
 * across all modern desktop and mobile browsers seamlessly.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const tsUrl = searchParams.get('ts') || searchParams.get('url');
    const vToken = searchParams.get('v');

    let resolvedUrl = '';

    // We must define origin earlier to use it in vToken
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const protocol = forwardedProto ? `${forwardedProto}:` : (request.nextUrl.protocol || 'http:');
    const cleanProtocol = protocol.endsWith(':') ? protocol : `${protocol}:`;
    const origin = `${cleanProtocol}//${host}`;

    if (vToken) {
        resolvedUrl = `${origin}/api/video?v=${encodeURIComponent(vToken)}`;
    } else if (tsUrl) {
        resolvedUrl = tsUrl.trim();
        if (resolvedUrl.startsWith('/')) {
            resolvedUrl = `${origin}${resolvedUrl}`;
        }
    } else {
        return new NextResponse('Missing "ts" or "v" parameter', { status: 400 });
    }



    // Generate RFC 8216 compliant single-segment HLS VOD playlist
    const playlist = [
        '#EXTM3U',
        '#EXT-X-VERSION:3',
        '#EXT-X-TARGETDURATION:7200',
        '#EXT-X-MEDIA-SEQUENCE:0',
        '#EXT-X-PLAYLIST-TYPE:VOD',
        '#EXTINF:7200.0,',
        resolvedUrl,
        '#EXT-X-ENDLIST',
        ''
    ].join('\n');

    return new NextResponse(playlist, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Cache-Control': 'public, max-age=3600',
        }
    });
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
