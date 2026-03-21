
import { getFeaturedCategories, getAllSeries, getTopPicks } from '@/lib/data';
import { getTranslations, getGeneralSettings } from '@/lib/data.actions';
import { translationKeys } from '@/lib/translation-keys';
import { SeriesCard } from '@/components/series-card';
import { HeroSection } from '@/components/hero-section';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Clapperboard, TrendingUp, Sparkles, PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { i18n } from '@/i18n-config';
import { ContinueWatching } from '@/components/continue-watching';
import { Suspense } from 'react';
import { SeriesCarouselSkeleton } from '@/components/skeletons';
import { PwaInstallPrompt } from '@/components/pwa-install-prompt';
import type { Metadata } from 'next';

export const revalidate = 60; // 60 seconds ISR caching for performance

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
    const { lang } = await params;
    const [settings, translations] = await Promise.all([
      getGeneralSettings(),
      getTranslations(lang)
    ]);
  
    const siteName = settings?.siteName || 'SnapReels';
    const translatedTitle = translations?.seo_site_title || settings?.seoTitle || siteName;
  
    return {
      title: translatedTitle,
      description: translations?.seo_site_description || settings?.seoDescription,
    };
}

// Helper to get translations server-side with English fallback
const getT = async (lang: string) => {
    const translations = await getTranslations(lang);
    const defaultTranslations = translationKeys.reduce((acc, item) => {
        acc[item.key] = item.default;
        return acc;
    }, {} as Record<string, string>);

    return (key: string, replacements?: Record<string, string | number>) => {
        const val = translations ? (translations as any)[key] : null;
        let translation = (val && val.trim() !== '') ? val : (defaultTranslations[key] || key);
        
        if (replacements) {
            Object.entries(replacements).forEach(([placeholder, value]) => {
                translation = translation.replace(`{${placeholder}}`, String(value));
            });
        }
        return translation;
    };
};

export default async function HomePage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const currentLang = lang || i18n.defaultLocale;
  const langPrefix = currentLang === i18n.defaultLocale ? '' : `/${currentLang}`;
  const t = await getT(currentLang);
  const settings = await getGeneralSettings();

  // Fetch data with target language filter
  const [allSeries, topPicksSeries, featuredCategories] = await Promise.all([
    getAllSeries(currentLang),
    getTopPicks(12, currentLang),
    getFeaturedCategories()
  ]);

  const heroSeries = allSeries.filter(s => s.isFeatured);

  return (
    <div className="flex flex-col min-h-screen bg-background relative overflow-hidden">
      
      {/* Dynamic Hero Section */}
      <HeroSection series={heroSeries} />
      
      <main className="container mx-auto px-4 py-12 md:py-20 space-y-20 relative z-10">
        
        {/* User Engagement Section */}
        <Suspense fallback={<SeriesCarouselSkeleton />}>
            <ContinueWatching />
        </Suspense>
      
        {!allSeries || allSeries.length === 0 ? (
            <div className="text-center py-32 bg-card/20 rounded-3xl border-2 border-dashed border-white/5 animate-in fade-in duration-1000">
                <div className="bg-primary/10 p-6 rounded-full inline-flex mb-6">
                    <Clapperboard className="h-16 w-16 text-primary" />
                </div>
                <h2 className="text-3xl font-black text-white">{t('home_empty_catalog_title')}</h2>
                <p className="mt-4 text-muted-foreground max-w-md mx-auto">
                    {t('home_empty_catalog_desc')}
                </p>
                <div className="mt-8">
                    <Button asChild size="lg" className="rounded-full px-10 font-black tracking-tight">
                        <Link href="/admin/series">{t('home_empty_catalog_cta_2')}</Link>
                    </Button>
                </div>
            </div>
        ) : (
          <>
            {/* Trending / Top Picks Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-400/10 rounded-xl">
                        <TrendingUp className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">
                            {t('home_top_picks')}
                        </h2>
                        <p className="text-[10px] font-bold text-muted-foreground tracking-[0.2em] uppercase">{t('home_top_picks_subtitle')}</p>
                    </div>
                </div>
                <Button variant="ghost" asChild className="text-primary font-black hover:bg-primary/10 rounded-full">
                    <Link href={`${langPrefix}/series`}>{t('home_more_videos')}</Link>
                </Button>
              </div>
              <Carousel
                opts={{ align: 'start', slidesToScroll: 'auto' }}
                className="w-full"
              >
                <CarouselContent className="-ml-4">
                  {topPicksSeries?.map((series, index) => (
                    <CarouselItem key={index} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-4">
                      <SeriesCard series={series} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="hidden md:flex -left-6 bg-background/50 backdrop-blur-md border-white/10" />
                <CarouselNext className="hidden md:flex -right-6 bg-background/50 backdrop-blur-md border-white/10" />
              </Carousel>
            </section>

            {/* AI Recommended or Categories */}
            {featuredCategories?.map(category => {
                const categorySeries = allSeries?.filter(s => s.genres?.includes(category.name)).slice(0, 12) || [];
                if (categorySeries.length === 0) return null;

                return (
                    <section key={category.id} className="space-y-6">
                        <div className="flex items-center justify-between border-l-4 border-primary pl-4">
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-white uppercase">{category.name}</h2>
                                <p className="text-[10px] font-bold text-muted-foreground tracking-[0.1em]">{t('home_category_subtitle', { categoryName: category.name })}</p>
                            </div>
                            <Button variant="ghost" asChild className="text-primary font-black hover:bg-primary/10 rounded-full">
                                <Link href={`${langPrefix}/category/${category.slug}`}>{t('home_more')}</Link>
                            </Button>
                        </div>
                        <Carousel
                            opts={{ align: 'start', slidesToScroll: 'auto' }}
                            className="w-full"
                        >
                            <CarouselContent className="-ml-4">
                                {categorySeries.map((series, index) => (
                                    <CarouselItem key={index} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-4">
                                        <SeriesCard series={series} />
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="hidden md:flex -left-6 bg-background/50 backdrop-blur-md border-white/10" />
                            <CarouselNext className="hidden md:flex -right-6 bg-background/50 backdrop-blur-md border-white/10" />
                        </Carousel>
                    </section>
                )
            })}

            {/* Bottom Catalog Discovery */}
            <section className="bg-card/30 p-10 rounded-[3rem] border border-white/5 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full group-hover:bg-primary/20 transition-all duration-1000" />
                
                <div className="flex items-center gap-3 mb-10">
                    <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                    <h2 className="text-3xl font-black tracking-tighter text-white italic">{t('home_all_series')}</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
                    {allSeries?.map((series) => (
                        <SeriesCard key={series.id} series={series} />
                    ))}
                </div>
                <div className="mt-12 text-center">
                    <Button variant="outline" asChild size="lg" className="rounded-full border-primary/20 hover:bg-primary/5 px-12 font-black">
                        <Link href={`${langPrefix}/series`}>{t('home_view_full_catalog')}</Link>
                    </Button>
                </div>
            </section>
          </>
        )}
      </main>
      
      {settings?.pwaEnabled && (
        <PwaInstallPrompt delay={settings.pwaInstallDelay || 30} />
      )}

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>
    </div>
  );
}
