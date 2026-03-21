import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { getSecureVideoUrl } from '@/lib/actions';

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

        const allSeries = await db.collection('series').find(filter).toArray();
        const shorts: any[] = [];

        for (const s of allSeries) {
            const seriesId = s._id.toString();
            // Find episode 1
            const ep = await db.collection('episodes').findOne(
                { seriesId },
                { sort: { episodeInSeason: 1 } }
            );

            if (ep && ep.videoSources?.[0]?.url) {
                const epNum = ep.episodeInSeason || 1;
                const rawVideoUrl = ep.videoSources[0].url;
                const secureUrl = await getSecureVideoUrl(rawVideoUrl);
                const videoUrl = secureUrl ? (secureUrl.startsWith('http') ? secureUrl : `${origin}${secureUrl}`) : '';

                if (!videoUrl) continue;

                const coverUrl = s.coverUrl ? (s.coverUrl.startsWith('http') ? s.coverUrl : `${origin}${s.coverUrl}`) : '';
                const featuredCoverUrl = s.featuredCoverUrl ? (s.featuredCoverUrl.startsWith('http') ? s.featuredCoverUrl : `${origin}${s.featuredCoverUrl}`) : '';

                shorts.push({
                    drama: {
                        id: seriesId,
                        title: s.title || '',
                        description: s.description || '',
                        coverUrl: coverUrl,
                        featuredCoverUrl: featuredCoverUrl,
                        category: s.genres?.[0] || 'Romance',
                        genres: s.genres || [],
                        rating: 4.8,
                        totalEpisodes: s.totalEpisodes || 10,
                        releaseYear: s.releaseYear || (s.createdAt ? new Date(s.createdAt).getFullYear() : new Date().getFullYear()),
                        isTrending: !!s.isFeatured,
                        tags: s.tags || [],
                        slug: s.slug || '',
                        views: s.views || 0,
                        likes: s.likes || 0,
                        createdAtMillis: s.createdAt ? new Date(s.createdAt).getTime() : 0,
                    },
                    episode: {
                        id: ep._id.toString(),
                        dramaId: seriesId,
                        title: ep.title || `Episode ${epNum}`,
                        episodeNumber: epNum,
                        videoUrl: videoUrl,
                        isPremium: false,
                        coinCost: 0,
                        durationSec: ep.durationSec || ep.duration || 0,
                        subtitles: (ep.subtitles || []).map((sub: any) => {
                            const rawSubUrl = sub.url || '';
                            let subUrl = rawSubUrl ? (rawSubUrl.startsWith('http') ? rawSubUrl : `${origin}${rawSubUrl}`) : '';
                            if (subUrl.includes('/uploads/videos/') || subUrl.includes('/uploads/subtitles/')) {
                                const fileName = subUrl.split('/').pop()?.split('?')[0] || '';
                                if (fileName) {
                                    subUrl = `${origin}/api/subtitles?file=${encodeURIComponent(fileName)}`;
                                }
                            }
                            return {
                                language: sub.language || 'English',
                                languageCode: sub.languageCode || 'en',
                                url: subUrl,
                            };
                        }).filter((s: any) => s.url)
                    }
                });
            }
        }

        return NextResponse.json(shorts);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
