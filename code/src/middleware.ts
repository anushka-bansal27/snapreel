'use server';
import { NextResponse, type NextRequest } from 'next/server';
import { i18n } from '@/i18n-config';

const { locales, defaultLocale: staticDefaultLocale } = i18n;

let cachedDefaultLocale = '';
let cacheTime = 0;

async function getDefaultLocale(origin: string): Promise<string> {
    if (cachedDefaultLocale && Date.now() - cacheTime < 10000) {
        return cachedDefaultLocale;
    }
    try {
        const res = await fetch(`${origin}/api/default-locale`);
        if (res.ok) {
            const data = await res.json();
            if (data.defaultLocale) {
                cachedDefaultLocale = data.defaultLocale;
                cacheTime = Date.now();
                return cachedDefaultLocale;
            }
        }
    } catch (e) {
        console.error('Failed to fetch default locale in middleware:', e);
    }
    return staticDefaultLocale;
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Security Check: Allow HLS playlists (.m3u8), TS chunks (.ts), DASH (.mpd, .m4s), and subtitles (.vtt, .srt)
    if (pathname.startsWith('/uploads/videos/')) {
        const lowerPath = pathname.toLowerCase();
        const isAllowedDirect = 
            lowerPath.endsWith('.vtt') || 
            lowerPath.endsWith('.srt') || 
            lowerPath.endsWith('.m3u8') || 
            lowerPath.endsWith('.ts') || 
            lowerPath.endsWith('.m4s') || 
            lowerPath.endsWith('.mpd');
        if (!isAllowedDirect) {
            return new NextResponse('Access Denied: Direct file access is forbidden', { status: 403 });
        }
    }

    // IndexNow Intercept
    if (pathname.endsWith('.txt') && pathname.length > 20 && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
        const key = pathname.substring(1, pathname.length - 4);
        const newUrl = request.nextUrl.clone();
        newUrl.pathname = '/api/indexnow-key';
        newUrl.searchParams.set('key', key);
        return NextResponse.rewrite(newUrl);
    }

    // Bypass middleware for Next.js internal paths, API, static files, and general uploads
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/api') ||
        pathname.startsWith('/uploads') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Bypass localization for installation, activation, and share pages
    if (
        pathname === '/install' || pathname.startsWith('/install/') ||
        pathname === '/activate' || pathname.startsWith('/activate/') ||
        pathname === '/share' || pathname.startsWith('/share/')
    ) {
        return NextResponse.next();
    }

    // Admin panel protection check
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        const authCookie = request.cookies.get('auth');
        const isLoggedIn = !!authCookie?.value && /^[a-f0-9]{32}:[a-f0-9]+$/i.test(authCookie.value);
        const isAuthRoute = pathname === '/admin/login' || pathname === '/admin/forgot-password' || pathname === '/admin/reset-password';

        if (!isLoggedIn && !isAuthRoute) {
            return NextResponse.redirect(new URL('/admin/login', request.url));
        }
        if (isLoggedIn && isAuthRoute) {
            return NextResponse.redirect(new URL('/admin', request.url));
        }
        return NextResponse.next();
    }

    // Get default locale with caching (Site-wide setting)
    const siteDefaultLocale = await getDefaultLocale(request.nextUrl.origin);
    const userLocale = request.cookies.get('userLocale')?.value;

    const pathnameHasLocale = locales.some(
        (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
    );

    // If pathname starts with default locale, redirect to clean URL without it
    if (pathname.startsWith(`/${siteDefaultLocale}/`) || pathname === `/${siteDefaultLocale}`) {
        const newPath = pathname.replace(`/${siteDefaultLocale}`, '') || '/';
        return NextResponse.redirect(new URL(newPath, request.url));
    }
    
    // Rewrite path to prepend default locale if not present
    if (!pathnameHasLocale) {
        // If user has a preferred language different from site default, redirect to it
        if (userLocale && userLocale !== siteDefaultLocale && locales.includes(userLocale as any)) {
            return NextResponse.redirect(new URL(`/${userLocale}${pathname}`, request.url));
        }

        const newUrl = request.nextUrl.clone();
        newUrl.pathname = `/${siteDefaultLocale}${pathname}`;
        return NextResponse.rewrite(newUrl);
    }
    
    return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|uploads|favicon.ico|robots.txt|manifest.json|sitemap.xml).*)',
    '/uploads/videos/:path*',
  ],
};
