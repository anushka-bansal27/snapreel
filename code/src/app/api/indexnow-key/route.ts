import { NextResponse } from 'next/server';
import { getPluginsSettings } from '@/lib/data.actions';

export async function GET(request: Request) {
    const { searchParams, pathname } = new URL(request.url);
    let key = searchParams.get('key');
    
    // Fallback: extract from pathname if request was rewritten from a .txt file
    if (!key && pathname.endsWith('.txt')) {
        key = pathname.substring(pathname.lastIndexOf('/') + 1, pathname.length - 4);
    }

    if (!key) {
        return new NextResponse('Missing key', { status: 400 });
    }

    const settings = await getPluginsSettings() as any;
    
    if (settings && settings.indexNowEnabled && settings.indexNowKey === key) {
        return new NextResponse(key, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
        });
    }

    return new NextResponse('Not found', { status: 404 });
}
