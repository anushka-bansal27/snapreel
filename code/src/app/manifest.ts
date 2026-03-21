import { MetadataRoute } from 'next';
import { getGeneralSettings } from '@/lib/data.actions';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getGeneralSettings();
  const favicon = settings?.faviconUrl || '/favicon.ico';
  const siteName = settings?.siteName || 'SnapReels';

  return {
    name: siteName,
    short_name: siteName,
    description: settings?.seoDescription || 'Explore a Universe of Drama.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#f857a6',
    icons: [
      {
        src: favicon,
        sizes: 'any',
        type: 'image/x-icon',
      },
      {
        src: favicon,
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: favicon,
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
