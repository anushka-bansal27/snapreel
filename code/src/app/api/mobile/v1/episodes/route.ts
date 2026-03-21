import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
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

        const seriesId = request.nextUrl.searchParams.get('seriesId');
        if (!seriesId) {
            return NextResponse.json({ error: 'Missing seriesId parameter' }, { status: 400 });
        }

        // Fetch series to know how many free episodes it has
        let seriesQuery;
        try {
            seriesQuery = { _id: ObjectId.isValid(seriesId) ? new ObjectId(seriesId) : seriesId as any };
        } catch (e) {
            seriesQuery = { _id: seriesId as any };
        }
        const series = await db.collection('series').findOne(seriesQuery);
        const freeCount = series?.freeEpisodesCount ?? 3;

        // Fetch monetization settings for coin cost
        const monSettings = await db.collection('settings').findOne({ _id: 'monetization' as any });
        const defaultCost = monSettings?.episodeCost ?? 10;

        const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || 'localhost:3000';
        const forwardedProto = request.headers.get('x-forwarded-proto');
        const protocol = forwardedProto ? `${forwardedProto}:` : (request.nextUrl.protocol || 'http:');
        const cleanProtocol = protocol.endsWith(':') ? protocol : `${protocol}:`;
        const origin = `${cleanProtocol}//${host}`;

        // Fetch episodes sorted by number
        const episodes = await db.collection('episodes')
            .find({ seriesId: seriesId })
            .sort({ episodeInSeason: 1 })
            .toArray();

        const mappedEpisodes = await Promise.all(episodes.map(async (ep) => {
            const epNum = ep.episodeInSeason || 1;
            const isPremium = epNum > freeCount;
            const rawVideoUrl = ep.videoSources?.[0]?.url || '';
            const secureUrl = await getSecureVideoUrl(rawVideoUrl);
            const videoUrl = secureUrl ? (secureUrl.startsWith('http') ? secureUrl : `${origin}${secureUrl}`) : '';
            return {
                id: ep._id.toString(),
                dramaId: ep.seriesId || seriesId,
                title: ep.title || `Episode ${epNum}`,
                episodeNumber: epNum,
                videoUrl: videoUrl,
                isPremium: isPremium,
                coinCost: isPremium ? defaultCost : 0,
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
            };
        }));

        return NextResponse.json(mappedEpisodes);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
