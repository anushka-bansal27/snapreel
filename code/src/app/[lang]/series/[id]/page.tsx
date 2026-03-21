import { getSeriesBySlugOrId, getEpisodesForSeries } from '@/lib/data';
import type { Metadata } from 'next';
import { SeriesDetailView } from '@/components/series-detail-view';
import { notFound } from 'next/navigation';
import { getSecureVideoUrl } from '@/lib/actions';

export const revalidate = 60; // Cache for 60 seconds

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const series = await getSeriesBySlugOrId(id);

  if (!series) {
    return {
      title: 'Not Found',
      description: 'This series does not exist.',
    };
  }

  return {
    title: series.seoTitle || series.title,
    description: series.metaDescription || series.description,
    keywords: series.metaKeywords || series.genres,
  };
}

export default async function SeriesDetailPage({ params, searchParams }: { params: Promise<{ id: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const { id } = await params;
    const sp = await searchParams;
    const series = await getSeriesBySlugOrId(id);
    if (!series) {
        notFound();
    }

    const episodes = await getEpisodesForSeries(series.id);
    let initialVideoUrl = '';

    const targetEpNum = typeof sp?.ep === 'string' ? parseInt(sp.ep, 10) : null;
    const targetEp = targetEpNum ? episodes.find(e => e.episodeInSeason === targetEpNum) : episodes[0];

    if (targetEp && targetEp.videoSources && targetEp.videoSources.length > 0) {
        initialVideoUrl = targetEp.videoSources[0].url;
    } else if (episodes.length > 0 && episodes[0].videoSources && episodes[0].videoSources.length > 0) {
        initialVideoUrl = episodes[0].videoSources[0].url;
    }

    return (
        <SeriesDetailView 
            key={series.id} 
            initialSeries={series} 
            initialEpisodes={episodes}
            initialVideoUrl={initialVideoUrl}
        />
    );
}
