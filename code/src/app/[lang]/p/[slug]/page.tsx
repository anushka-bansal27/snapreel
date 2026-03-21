
import { getPageBySlug } from '@/lib/data';
import { getTranslations } from '@/lib/data.actions';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { i18n } from '@/i18n-config';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string, lang: string }>}): Promise<Metadata> {
    const { slug, lang } = await params;
    const [page, translations] = await Promise.all([
        getPageBySlug(slug),
        getTranslations(lang)
    ]);

    if (!page) return {};

    const titleKey = `page_title_${slug}`;
    const translatedTitle = translations?.[titleKey];
    const title = (translatedTitle && translatedTitle.trim() !== '') ? translatedTitle : page.title;

    return {
        title: title,
    };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string, lang: string }>}) {
    const { slug, lang } = await params;
    const currentLang = lang || i18n.defaultLocale;

    const [page, translations] = await Promise.all([
        getPageBySlug(slug),
        getTranslations(currentLang)
    ]);

    if (!page) {
        notFound();
    }

    // Attempt to use translated versions. 
    // Fallback to English (page.title / page.content) if the translation key is missing or empty.
    const titleKey = `page_title_${slug}`;
    const contentKey = `page_content_${slug}`;
    
    const translatedTitle = translations?.[titleKey];
    const translatedContent = translations?.[contentKey];

    const title = (translatedTitle && translatedTitle.trim() !== '') ? translatedTitle : page.title;
    const content = (translatedContent && translatedContent.trim() !== '') ? translatedContent : page.content;

    const rtlLocales = ['ar', 'fa', 'he', 'ur'];
    const isRTL = rtlLocales.includes(currentLang);

    return (
        <div className="container mx-auto max-w-4xl py-24 sm:py-36 px-4">
            <Card className="bg-card/50 border-white/5 backdrop-blur-sm shadow-2xl overflow-hidden rounded-[2.5rem]">
                <CardHeader className="bg-white/[0.02] border-b border-white/5 py-8 md:py-12">
                    <CardTitle className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase text-center">{title}</CardTitle>
                </CardHeader>
                <CardContent className="py-12 md:p-16">
                    <div 
                        dir={isRTL ? 'rtl' : 'ltr'}
                        className="prose dark:prose-invert prose-lg max-w-none prose-headings:italic prose-headings:font-black prose-headings:tracking-tighter prose-headings:uppercase prose-p:text-muted-foreground prose-p:leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
