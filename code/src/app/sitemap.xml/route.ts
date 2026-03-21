import { getAllSeries, getAllPages } from '@/lib/data';
import { getGeneralSettings } from '@/lib/data.actions';
import type { Series, CustomPage, GeneralSettings } from '@/lib/types';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function generateSiteMap(baseUrl: string, series: Series[], pages: CustomPage[], settings: GeneralSettings | null) {
    const seriesUrl = (item: Series) => {
        const useSlug = settings?.seriesUrlFormat === 'slug' && item.slug;
        return `${baseUrl}/series/${useSlug ? item.slug : item.id}`;
    };

    return `<?xml version="1.0" encoding="UTF-8"?>
   <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
     <url>
       <loc>${baseUrl}</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>1.0</priority>
     </url>
     <url>
       <loc>${baseUrl}/contact</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.5</priority>
     </url>
      <url>
       <loc>${baseUrl}/wallet</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.7</priority>
     </url>
     <url>
       <loc>${baseUrl}/profile</loc>
       <lastmod>${new Date().toISOString()}</lastmod>
       <priority>0.7</priority>
     </url>
     ${series
       .map((item) => {
         return `
       <url>
           <loc>${seriesUrl(item)}</loc>
           <lastmod>${new Date().toISOString()}</lastmod>
           <priority>0.8</priority>
       </url>
     `;
       })
       .join('')}
      ${pages
       .map((page) => {
         const pagePath = page.slug === 'installation-setup' ? `/installation-setup` : `/p/${page.slug}`;
         return `
       <url>
           <loc>${`${baseUrl}${pagePath}`}</loc>
           <lastmod>${new Date().toISOString()}</lastmod>
           <priority>0.6</priority>
       </url>
     `;
       })
       .join('')}
   </urlset>
 `;
}

export async function GET() {
  try {
    const settings = await getGeneralSettings();
    
    // Use the siteUrl from settings, remove any trailing slash. Fallback to a generic placeholder if not set.
    const baseUrl = (settings?.siteUrl || 'https://example.com').replace(/\/$/, '');
    
    const [allSeries, allPages] = await Promise.all([
      getAllSeries(),
      getAllPages(),
    ]);
    
    const sitemap = generateSiteMap(baseUrl, allSeries, allPages, settings);

    return new NextResponse(sitemap, {
        headers: {
            'Content-Type': 'application/xml',
        },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
