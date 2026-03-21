
import { notFound, redirect } from 'next/navigation';
import { AppProviders } from '@/components/app-providers';
import { i18n } from '@/i18n-config';
import { getGeneralSettings, getPluginsSettings, isAppInstalled, getTranslations } from '@/lib/data.actions';
import { OneSignalInitializer } from '@/components/onesignal-initializer';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const [settings, translations] = await Promise.all([
    getGeneralSettings(),
    getTranslations(lang)
  ]);

  const siteName = settings?.siteName || 'SnapReels';
  
  // Use translated SEO title if available, otherwise fallback to settings or default
  const translatedTitle = translations?.seo_site_title || settings?.seoTitle || siteName;
  const translatedDesc = translations?.seo_site_description || settings?.seoDescription || 'Explore a Universe of Drama.';
  const translatedKeywords = translations?.seo_site_keywords || settings?.seoKeywords || 'drama, movies, reels, streaming';

  return {
    title: translatedTitle,
    description: translatedDesc,
    keywords: translatedKeywords,
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  
  if (!i18n.locales.includes(lang as any)) {
    notFound();
  }

  // Optimized Installation Check for NextJS 15
  const installed = await isAppInstalled();
  if (!installed) {
      redirect('/install');
  }

  // Periodic License Check removed from public layout so visitors can browse and watch videos normally without activation block.

  const [settings, pluginsSettings] = await Promise.all([
    getGeneralSettings(),
    getPluginsSettings(),
  ]);
  
  return (
    <AppProviders lang={lang} settings={settings}>
      <OneSignalInitializer />
      <AnalyticsTracker gaId={pluginsSettings?.gaId} />
      {children}
    </AppProviders>
  );
}
