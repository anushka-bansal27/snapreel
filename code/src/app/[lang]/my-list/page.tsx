'use client';
import { useMemo, useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import type { Series, WatchHistory } from '@/lib/types';
import { SeriesCard } from '@/components/series-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, History, VideoOff, Trash2 } from 'lucide-react';
import { useFavorites } from '@/lib/favorites-provider';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useWatchHistory } from '@/lib/history-provider';
import { useTranslation } from '@/lib/translation-provider';
import { getAllSeries } from '@/lib/data.actions';
import { useSettings } from '@/lib/settings-provider';

function FavoritesGrid() {
    const { favoriteIds, loading: favoritesLoading } = useFavorites();
    const { t } = useTranslation();
    const params = useParams();
    const lang = (params?.lang as string) || i18n.defaultLocale;
    const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
    
    const [allSeries, setAllSeries] = useState<Series[]>([]);
    const [seriesLoading, setSeriesLoading] = useState(true);

    useEffect(() => {
        getAllSeries(lang).then(data => {
            setAllSeries(data);
            setSeriesLoading(false);
        });
    }, [lang]);

    const favoriteSeries = useMemo(() => {
        return allSeries.filter(s => favoriteIds.has(s.id));
    }, [allSeries, favoriteIds]);
    
    const loading = favoritesLoading || seriesLoading;

    if (!loading && (!favoriteSeries || favoriteSeries.length === 0)) {
        return (
             <div className="text-center py-20">
                <Heart className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{t('my_list_favorites_empty_title')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t('my_list_favorites_empty_desc')}
                </p>
                <Button asChild className="mt-6">
                    <Link href={langPrefix || '/'}>{t('my_list_find_something')}</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
            {loading && Array.from({ length: 12 }).map((_, i) => (
                <div key={i}>
                    <Skeleton className="aspect-[2/3] rounded-lg" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                </div>
            ))}
            {!loading && favoriteSeries?.map((series) => (
                <SeriesCard key={series.id} series={series} />
            ))}
        </div>
    )
}

function HistoryGrid() {
    const { watchHistory, loading: historyLoading, removeHistoryItem, clearAllHistory } = useWatchHistory();
    const { t } = useTranslation();
    const settings = useSettings();
    const [itemLimit, setItemLimit] = useState('10');
    const params = useParams();
    const lang = (params?.lang as string) || i18n.defaultLocale;
    const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
    
    const [allSeries, setAllSeries] = useState<Series[]>([]);
    const [seriesLoading, setSeriesLoading] = useState(true);

    useEffect(() => {
        getAllSeries(lang).then(data => {
            setAllSeries(data);
            setSeriesLoading(false);
        });
    }, [lang]);

    const seriesMap = useMemo(() => {
        return new Map(allSeries.map(s => [s.id, s]));
    }, [allSeries]);

    const displayedHistory = useMemo(() => {
        const limit = parseInt(itemLimit, 10);
        return watchHistory
            .map(historyItem => {
                const series = seriesMap.get(historyItem.seriesId);
                return series ? { historyItem, series } : null;
            })
            .filter((item): item is { historyItem: WatchHistory; series: Series } => item !== null)
            .slice(0, limit);
    }, [watchHistory, seriesMap, itemLimit]);

    const loading = historyLoading || seriesLoading;

    if (!loading && displayedHistory.length === 0) {
        return (
            <div className="text-center py-20">
                <VideoOff className="mx-auto h-16 w-16 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">{t('my_list_history_empty_title')}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    {t('my_list_history_empty_desc')}
                </p>
                <Button asChild className="mt-6">
                    <Link href={langPrefix || '/'}>{t('my_list_find_something')}</Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" disabled={watchHistory.length === 0}>
                            <Trash2 className="mr-2 h-4 w-4" /> {t('my_list_history_clear_all')}
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('common_are_you_sure')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('my_list_history_clear_confirm_desc')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('common_cancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={clearAllHistory}>{t('my_list_history_clear_button')}</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{t('common_show')}</span>
                    <Select value={itemLimit} onValueChange={setItemLimit}>
                        <SelectTrigger className="w-[80px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="10">10</SelectItem>
                            <SelectItem value="20">20</SelectItem>
                            <SelectItem value="50">50</SelectItem>
                            <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
                {loading && Array.from({ length: parseInt(itemLimit, 10) }).map((_, i) => (
                    <div key={i}>
                        <Skeleton className="aspect-[2/3] rounded-lg" />
                        <Skeleton className="h-4 w-3/4 mt-2" />
                    </div>
                ))}
                {!loading && displayedHistory.map(({ historyItem, series }) => {
                    const seriesIdPart = settings?.seriesUrlFormat === 'slug' && series.slug
                        ? series.slug
                        : series.id;
                    const href = `${langPrefix}/series/${seriesIdPart}?ep=${historyItem.episodeInSeason}`;
                    return (
                        <div key={historyItem.id} className="relative group/history">
                             <SeriesCard 
                                series={series} 
                                badgeText={`Ep. ${historyItem.episodeInSeason}`}
                                href={href}
                            />
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon" className="absolute top-1 right-10 z-20 h-8 w-8 opacity-0 group-hover/history:opacity-100 transition-opacity">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>{t('my_list_history_remove_title')}</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogDescription>
                                        {t('my_list_history_remove_confirm_desc', { seriesTitle: series.title })}
                                    </AlertDialogDescription>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>{t('common_cancel')}</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => removeHistoryItem(historyItem.seriesId)}>{t('common_remove')}</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default function MyListPage() {
  const { user, loading } = useUser();
  const { t } = useTranslation();

  if (!loading && !user) {
    return (
        <div className="container mx-auto max-w-5xl py-24 sm:py-36 text-center">
            <h1 className="text-3xl font-bold">{t('my_list_login_title')}</h1>
            <p className="text-muted-foreground mt-2">{t('my_list_login_desc')}</p>
        </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-8 pt-28 md:pt-36">
        <h1 className="text-4xl font-bold">{t('my_list_title')}</h1>
        <Tabs defaultValue="favorites" className="w-full">
            <TabsList>
                <TabsTrigger value="favorites"><Heart className="mr-2 h-4 w-4" /> {t('my_list_favorites_tab')}</TabsTrigger>
                <TabsTrigger value="history"><History className="mr-2 h-4 w-4" /> {t('my_list_history_tab')}</TabsTrigger>
            </TabsList>
            <TabsContent value="favorites" className="pt-6">
                <FavoritesGrid />
            </TabsContent>
            <TabsContent value="history" className="pt-6">
                 <HistoryGrid />
            </TabsContent>
        </Tabs>
    </div>
  );
}
