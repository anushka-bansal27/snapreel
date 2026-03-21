
import { MongoClient, ObjectId } from 'mongodb';
import { getDb } from './mongodb';
import type { Series, Category, CustomPage, Episode } from './types';

const mapDoc = (doc: any) => {
    if (!doc) return null;
    const { _id, ...rest } = doc;
    return { id: _id.toString(), ...rest };
}

export async function getAllSeries(lang?: string): Promise<Series[]> {
    const db = await getDb();
    const seriesCollection = db.collection('series');
    
    // Filter by target language if provided
    const query = lang ? { targetLanguages: lang } : {};
    
    const series = await seriesCollection.find(query).sort({ title: 1 }).toArray();
    return series.map(s => mapDoc(s)) as Series[];
}

export async function getTopPicks(limit: number, lang?: string): Promise<Series[]> {
    const db = await getDb();
    const seriesCollection = db.collection('series');
    
    const query = lang ? { targetLanguages: lang } : {};
    
    const series = await seriesCollection.find(query).sort({ title: 'asc' }).limit(limit).toArray();
    return series.map(s => mapDoc(s)) as Series[];
}

export async function getFeaturedCategories(): Promise<Category[]> {
    const db = await getDb();
    const categoriesCollection = db.collection('categories');
    const categories = await categoriesCollection.find({ showOnHomepage: true }).toArray();
    return categories.map(c => mapDoc(c)) as Category[];
}

export async function getSeriesByCategory(categoryName: string, lang?: string): Promise<Series[]> {
    const db = await getDb();
    const seriesCollection = db.collection('series');
    
    const query: any = { genres: categoryName };
    if (lang) {
        query.targetLanguages = lang;
    }
    
    const series = await seriesCollection.find(query).sort({ title: 1 }).toArray();
    return series.map(s => mapDoc(s)) as Series[];
}

export async function getSeriesBySlugOrId(identifier: string): Promise<Series | null> {
    const db = await getDb();
    const seriesCollection = db.collection('series');
    
    let series = await seriesCollection.findOne({ slug: identifier });
    
    if (!series && ObjectId.isValid(identifier)) {
        series = await seriesCollection.findOne({ _id: new ObjectId(identifier) });
    }
    
    return mapDoc(series) as Series | null;
}

export async function getShareItem(slugParts: string[]): Promise<{ series: Series | null; episode: Episode | null; totalEpisodes: number }> {
    const db = await getDb();
    if (!slugParts || slugParts.length === 0) {
        return { series: null, episode: null, totalEpisodes: 0 };
    }

    let series: Series | null = null;
    let episode: Episode | null = null;

    if (slugParts[0] === 'ep' && slugParts[1]) {
        const epId = slugParts[1];
        let epDoc = null;
        if (ObjectId.isValid(epId)) {
            epDoc = await db.collection('episodes').findOne({ _id: new ObjectId(epId) });
        }
        if (!epDoc) {
            epDoc = await db.collection('episodes').findOne({ id: epId });
        }
        if (epDoc) {
            episode = mapDoc(epDoc) as Episode;
            if (episode.seriesId) {
                series = await getSeriesBySlugOrId(episode.seriesId);
            }
        }
    } else {
        const identifier = slugParts[0];
        series = await getSeriesBySlugOrId(identifier);
    }

    let totalEpisodes = 0;
    if (series?.id) {
        totalEpisodes = await db.collection('episodes').countDocuments({ seriesId: series.id });
    }

    return { series, episode, totalEpisodes };
}

export async function getEpisodesForSeries(seriesId: string): Promise<Episode[]> {
    const db = await getDb();
    const episodesCollection = db.collection('episodes');
    const episodes = await episodesCollection.find({ seriesId: seriesId }).sort({ episodeInSeason: 1 }).toArray();
    const mapped = episodes.map(e => mapDoc(e)) as Episode[];
    try {
        const { getSecureVideoUrl } = await import('./actions/content');
        await Promise.all(mapped.map(async (ep) => {
            if (ep.videoSources && ep.videoSources.length > 0) {
                await Promise.all(ep.videoSources.map(async (source) => {
                    source.url = await getSecureVideoUrl(source.url);
                }));
            }
        }));
    } catch (err) {
        console.error("Failed to pre-compute secure URLs in data.ts:", err);
    }
    return mapped;
}

export async function getSimilarSeries(series: Series, lang?: string): Promise<Series[]> {
    if (!series.genres || series.genres.length === 0) {
        return [];
    }
    const db = await getDb();
    const seriesCollection = db.collection('series');
    
    const query: any = {
        genres: { $in: series.genres },
        _id: { $ne: new ObjectId(series.id) }
    };
    
    if (lang) {
        query.targetLanguages = lang;
    }
    
    const similar = await seriesCollection.find(query).limit(6).toArray();
    return similar.map(s => mapDoc(s)) as Series[];
}

export async function getAllPages(): Promise<CustomPage[]> {
    const db = await getDb();
    const pagesCollection = db.collection('pages');
    const pages = await pagesCollection.find({}).toArray();
    return pages.map(p => mapDoc(p)) as CustomPage[];
}

export async function getPageBySlug(slug: string): Promise<CustomPage | null> {
    const db = await getDb();
    const pagesCollection = db.collection('pages');
    const page = await pagesCollection.findOne({ slug: slug });
    return mapDoc(page) as CustomPage | null;
}
