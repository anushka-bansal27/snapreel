import { NextResponse } from 'next/server';
import { getGeneralSettings } from '@/lib/data.actions';

export async function GET() {
    try {
        const settings = await getGeneralSettings();
        const defaultLocale = settings?.defaultLanguageCode || 'en';
        const response = NextResponse.json({ defaultLocale });
        response.cookies.set('defaultLocale', defaultLocale, { maxAge: 31536000, path: '/' });
        return response;
    } catch (e) {
        return NextResponse.json({ defaultLocale: 'en' });
    }
}
export const dynamic = 'force-dynamic';
