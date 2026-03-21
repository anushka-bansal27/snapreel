'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Autoplay from 'embla-carousel-autoplay';
import { Play } from 'lucide-react';
import * as React from 'react';

import type { Series } from '@/lib/types';
import { i18n } from '@/i18n-config';
import { useSettings } from '@/lib/settings-provider';
import { useTranslation } from '@/lib/translation-provider';
import { cn } from '@/lib/utils';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';

interface HeroSectionProps {
  series: Series[];
}

export function HeroSection({ series }: HeroSectionProps) {
  const [api, setApi] = React.useState<CarouselApi>();
  const [current, setCurrent] = React.useState(0);
  const settings = useSettings();
  const { t } = useTranslation();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
  const autoplay = React.useRef(
    Autoplay({
      delay: 5000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
    })
  );

  React.useEffect(() => {
    if (!api) return;

    const updateCurrent = () => setCurrent(api.selectedScrollSnap());
    updateCurrent();
    api.on('select', updateCurrent);
    api.on('reInit', updateCurrent);

    return () => {
      api.off('select', updateCurrent);
      api.off('reInit', updateCurrent);
    };
  }, [api]);

  const getSeriesUrl = (item: Series) => {
    const path = settings?.seriesUrlFormat === 'slug' && item.slug
      ? `/series/${item.slug}`
      : `/series/${item.id}`;
    return `${langPrefix}${path}`;
  };

  if (!series?.length) {
    return (
      <section className="flex min-h-[440px] items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-background pt-20">
        <p className="text-sm font-medium text-muted-foreground">No featured series available.</p>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden bg-slate-950 w-full"
      aria-label="Featured series"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {series.map((item, index) => (
          <Image
            key={item.id}
            src={item.featuredCoverUrl || item.coverUrl || '/img/no-cover.svg'}
            alt=""
            fill
            priority={index === 0}
            sizes="100vw"
            className={cn(
              'scale-125 object-cover blur-3xl transition-opacity duration-700',
              current === index ? 'opacity-55' : 'opacity-0'
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/75 to-background" />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      <Carousel
        setApi={setApi}
        className="relative z-10 w-full"
        plugins={[autoplay.current]}
        opts={{
          align: 'center',
          loop: series.length > 1,
          skipSnaps: false,
        }}
      >
        <CarouselContent className="items-center h-[50vh] sm:h-[60vh] md:h-[65vh] lg:h-[75vh] min-h-[400px] max-h-[700px]">
          {series.map((item, index) => {
            const isActive = current === index;

            return (
              <CarouselItem
                key={item.id}
                className="flex basis-full justify-center h-full"
              >
                <div
                  className={cn(
                    'group relative block w-full h-full overflow-hidden bg-zinc-950 transition-opacity duration-700 ease-out',
                    isActive ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <div className="relative w-full h-full">
                    <Image
                      src={item.featuredCoverUrl || item.coverUrl || '/img/no-cover.svg'}
                      alt={item.title}
                      fill
                      priority={index === 0}
                      sizes="100vw"
                      className="object-cover transition-transform [transition-duration:10s] group-hover:scale-105"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent" />
                    
                    {/* Content overlay */}
                    <div className="absolute bottom-0 left-0 w-full p-6 pb-14 sm:p-12 sm:pb-20 md:p-16 md:pb-24 lg:p-24 lg:pb-32 flex flex-col items-start gap-4 sm:gap-6 z-20">
                        <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white drop-shadow-2xl line-clamp-2 max-w-4xl">
                           {item.title}
                        </h2>
                        
                        <Link href={getSeriesUrl(item)}>
                            <Button size="lg" className="bg-primary hover:bg-primary/90 hover:scale-105 active:scale-95 text-white font-bold rounded-lg px-6 sm:px-10 py-6 sm:py-7 text-base sm:text-lg shadow-xl transition-all">
                                <Play className="w-5 h-5 sm:w-6 sm:h-6 mr-2 fill-current" />
                                {t('hero_watch_now') || 'Watch Now'}
                            </Button>
                        </Link>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        {series.length > 1 && (
            <>
                <CarouselPrevious className="hidden sm:flex left-4 sm:left-8 bg-black/40 border-0 hover:bg-black/70 hover:scale-110 text-white w-12 h-12 transition-all" />
                <CarouselNext className="hidden sm:flex right-4 sm:right-8 bg-black/40 border-0 hover:bg-black/70 hover:scale-110 text-white w-12 h-12 transition-all" />
            </>
        )}
      </Carousel>

      {series.length > 1 && (
        <div className="absolute bottom-4 sm:bottom-8 left-0 right-0 z-30 flex items-center justify-center gap-2" role="tablist" aria-label="Featured slides">
          {series.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-label={`Show ${item.title}`}
              aria-selected={current === index}
              onClick={() => api?.scrollTo(index)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                current === index
                  ? 'w-7 bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.55)]'
                  : 'w-2 bg-white/35 hover:bg-white/60'
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}
