import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const apiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('apiKey');
        if (!apiKey) {
            return NextResponse.json({ error: 'Unauthorized - Missing API Key' }, { status: 401 });
        }

        const db = await getDb();
        const settings = await db.collection('settings').findOne({ _id: 'mobile' as any });
        if (!settings || !settings.apiKey || settings.apiKey !== apiKey) {
            return NextResponse.json({ error: 'Unauthorized - Invalid API Key' }, { status: 401 });
        }

        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        const forwardedProto = request.headers.get('x-forwarded-proto');
        const protocol = forwardedProto ? `${forwardedProto}:` : (request.nextUrl.protocol || 'http:');
        const cleanProtocol = protocol.endsWith(':') ? protocol : `${protocol}:`;
        const origin = `${cleanProtocol}//${host}`;

        const lang = request.nextUrl.searchParams.get('lang') || request.nextUrl.searchParams.get('languageCode');
        const filter: any = {};
        if (lang) {
            filter.targetLanguages = lang;
        }

        const series = await db.collection('series').find(filter).toArray();
        const dramas = [];

        for (const s of series) {
            const seriesId = s._id.toString();
            const totalEpisodes = await db.collection('episodes').countDocuments({ seriesId });

            const coverUrl = s.coverUrl ? (s.coverUrl.startsWith('http') ? s.coverUrl : `${origin}${s.coverUrl}`) : '';
            const featuredCoverUrl = s.featuredCoverUrl ? (s.featuredCoverUrl.startsWith('http') ? s.featuredCoverUrl : `${origin}${s.featuredCoverUrl}`) : '';

            dramas.push({
                id: seriesId,
                title: s.title || '',
                description: s.description || '',
                coverUrl: coverUrl,
                featuredCoverUrl: featuredCoverUrl,
                category: s.genres?.[0] || 'Romance',
                genres: s.genres || [],
                rating: 4.8,
                totalEpisodes: totalEpisodes || 1,
                releaseYear: s.releaseYear || (s.createdAt ? new Date(s.createdAt).getFullYear() : new Date().getFullYear()),
                isTrending: !!s.isFeatured,
                tags: s.tags || [],
                slug: s.slug || '',
                views: s.views || 0,
                likes: s.likes || 0,
                createdAtMillis: s.createdAt ? new Date(s.createdAt).getTime() : 0,
            });
        }

        return NextResponse.json(dramas);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
