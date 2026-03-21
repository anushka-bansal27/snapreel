import { getAdSettings } from '@/lib/data.actions';
import { NextResponse } from 'next/server';

export async function GET() {
    const adsTxtData = await getAdSettings('ads_txt');
    const content = adsTxtData?.scriptContent || '';

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
