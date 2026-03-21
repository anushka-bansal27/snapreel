import { getAllSeries, getFeaturedCategories } from '@/lib/data';
import { getCategories } from '@/lib/data.actions';
import { SeriesCard } from '@/components/series-card';
import { translationKeys } from '@/lib/translation-keys';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { i18n } from '@/i18n-config';

const getT = (lang: string) => {
    const defaultTranslations = translationKeys.reduce((acc, item) => {
        acc[item.key] = item.default;
        return acc;
    }, {} as Record<string, string>);
    return (key: string) => defaultTranslations[key] || key;
};

export default async function AllSeriesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const resolvedLang = lang || i18n.defaultLocale;
  const langPrefix = resolvedLang === i18n.defaultLocale ? '' : `/${resolvedLang}`;
  const t = getT(resolvedLang);

  // Fetch all categories and all series for the current language
  const [allSeries, categories] = await Promise.all([
    getAllSeries(resolvedLang),
    getCategories()
  ]);

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 space-y-12 pt-28 md:pt-36">
        <h1 className="text-4xl font-black tracking-tight">{t('all_series_title')}</h1>

        {!allSeries || allSeries.length === 0 ? (
             <div className="text-center py-20">
                <h2 className="mt-6 text-2xl font-semibold">{t('home_empty_catalog_title')}</h2>
                <p className="mt-2 text-muted-foreground">
                    {t('home_empty_catalog_desc')}
                </p>
            </div>
        ) : (
            <div className="space-y-12">
                {categories?.map((category) => {
                    const categorySeries = allSeries.filter(s => s.genres?.includes(category.name));
                    if (categorySeries.length === 0) return null;

                    return (
                        <section key={category.id} className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-1.5 h-6 bg-primary rounded-full" />
                                    <h2 className="text-2xl font-bold">{category.name}</h2>
                                </div>
                                <Button variant="ghost" asChild className="text-muted-foreground hover:text-primary transition-colors">
                                    <Link href={`${langPrefix}/category/${category.slug}`}>
                                        {t('home_more')}
                                    </Link>
                                </Button>
                            </div>

                            <Carousel
                                opts={{ align: 'start', slidesToScroll: 'auto' }}
                                className="w-full"
                            >
                                <CarouselContent className="-ml-2 sm:-ml-4">
                                    {categorySeries.map((series) => (
                                        <CarouselItem key={series.id} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 pl-2 sm:pl-4">
                                            <SeriesCard series={series} />
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                <CarouselPrevious className="hidden md:flex -left-4" />
                                <CarouselNext className="hidden md:flex -right-4" />
                            </Carousel>
                        </section>
                    )
                })}

                <section className="pt-8 border-t">
                    <h2 className="text-2xl font-bold mb-6">Discover More</h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
                        {allSeries.slice(0, 18).map((series) => (
                            <SeriesCard key={series.id} series={series} />
                        ))}
                    </div>
                </section>
            </div>
        )}
    </div>
  );
}
