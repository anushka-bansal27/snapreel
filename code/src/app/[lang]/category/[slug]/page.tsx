
import { getCategoryBySlug, getAllSeries } from '@/lib/data.actions';
import { getSeriesByCategory } from '@/lib/data';
import { SeriesCard } from '@/components/series-card';
import { notFound } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { translationKeys } from '@/lib/translation-keys';

const getT = (lang: string) => {
    const defaultTranslations = translationKeys.reduce((acc, item) => {
        acc[item.key] = item.default;
        return acc;
    }, {} as Record<string, string>);
    return (key: string) => defaultTranslations[key] || key;
};

export default async function CategoryPage({ params }: { params: Promise<{ lang: string, slug: string }> }) {
    const { lang, slug } = await params;
    const currentLang = lang || i18n.defaultLocale;
    const t = getT(currentLang);

    const category = await getCategoryBySlug(slug);

    if (!category) {
        notFound();
    }

    const series = await getSeriesByCategory(category.name, currentLang);

    return (
        <div className="container mx-auto px-4 py-8 md:py-12 space-y-12 pt-28 md:pt-36 min-h-screen">
            <div className="flex items-center gap-3">
                <div className="w-1.5 h-8 bg-primary rounded-full" />
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">{category.name}</h1>
            </div>

            {series.length === 0 ? (
                <div className="text-center py-24 bg-card/20 rounded-[2.5rem] border-2 border-dashed border-white/5">
                    <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">
                        {t('category_no_series')}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-10">
                    {series.map((item) => (
                        <SeriesCard key={item.id} series={item} />
                    ))}
                </div>
            )}
        </div>
    );
}
