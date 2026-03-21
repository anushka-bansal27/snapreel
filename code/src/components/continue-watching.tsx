
'use client';

import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import type { Series, WatchHistory } from '@/lib/types';
import { SeriesCard } from '@/components/series-card';
import { useWatchHistory } from '@/lib/history-provider';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { SeriesCarouselSkeleton } from '@/components/skeletons';
import { getAllSeries } from '@/lib/data.actions';
import { useSettings } from '@/lib/settings-provider';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useTranslation } from '@/lib/translation-provider';

export function ContinueWatching() {
  const { user, loading: userLoading } = useUser();
  const { watchHistory, loading: historyLoading } = useWatchHistory();
  const { t } = useTranslation();
  const settings = useSettings();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;

  const [allSeries, setAllSeries] = useState<Series[]>([]);
  const [allLoading, setAllLoading] = useState(true);

  useEffect(() => {
    // Fetch all series available for the current language from MongoDB
    getAllSeries(lang).then(data => {
        setAllSeries(data);
        setAllLoading(false);
    }).catch(() => {
        setAllLoading(false);
    });
  }, [lang]);

  const continueWatchingItems = useMemo(() => {
    if (!watchHistory || watchHistory.length === 0 || !allSeries || allSeries.length === 0) return [];
    
    // Match history items (from MongoDB) with series metadata (from MongoDB)
    const seriesMap = new Map(allSeries.map(s => [s.id, s]));
    
    return watchHistory
        .map(historyItem => {
            const series = seriesMap.get(historyItem.seriesId);
            if (!series) return null;
            
            // Build the specific link to the last watched episode
            const seriesIdPart = (settings?.seriesUrlFormat === 'slug' && series.slug) ? series.slug : series.id;
            const href = `${langPrefix}/series/${seriesIdPart}?ep=${historyItem.episodeInSeason}`;
            
            return { series, historyItem, href };
        })
        .filter((item): item is { series: Series, historyItem: WatchHistory, href: string } => !!item)
        .slice(0, 10);
  }, [watchHistory, allSeries, settings, langPrefix]);

  const loading = userLoading || historyLoading || allLoading;

  if (loading) {
    return (
        <section>
            <SeriesCarouselSkeleton title={t('home_continue_watching')} />
        </section>
    );
  }

  // If no user or no history, hide the component entirely
  if (!user || continueWatchingItems.length === 0) {
    return null;
  }

  return (
    <section className="animate-in fade-in slide-in-from-top-4 duration-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">
          {t('home_continue_watching')}
        </h2>
      </div>
      <Carousel
        opts={{ align: 'start', slidesToScroll: 'auto' }}
        className="w-full"
      >
        <CarouselContent className="-ml-2 sm:-ml-4">
          {continueWatchingItems.map(({ series, historyItem, href }, index) => (
            <CarouselItem key={index} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-2 sm:pl-4">
              <SeriesCard 
                series={series} 
                badgeText={`Ep. ${historyItem.episodeInSeason}`} 
                href={href}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
    </section>
  );
}
