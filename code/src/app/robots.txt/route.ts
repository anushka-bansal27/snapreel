import { getGeneralSettings } from '@/lib/data.actions';
import { NextResponse } from 'next/server';

export async function GET() {
    const settings = await getGeneralSettings();
    const defaultRobots = `User-agent: *\nAllow: /\nSitemap: ${settings?.siteUrl || ''}/sitemap.xml`;
    const content = settings?.robotsTxt || defaultRobots;

    return new NextResponse(content, {
        headers: {
            'Content-Type': 'text/plain',
        },
    });
}
