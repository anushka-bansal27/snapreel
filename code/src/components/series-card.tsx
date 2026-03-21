'use client';
import Link from 'next/link';
import Image from 'next/image';
import type { Series } from '@/lib/types';
import { Bookmark, Play, Star } from 'lucide-react';
import { useSettings } from '@/lib/settings-provider';
import { useFavorites } from '@/lib/favorites-provider';
import { useUser } from '@/firebase';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';

interface SeriesCardProps {
  series: Series;
  badgeText?: string;
  href?: string; 
}

export function SeriesCard({ series, badgeText, href }: SeriesCardProps) {
  const settings = useSettings();
  const { user } = useUser();
  const { toast } = useToast();
  const { favoriteIds, toggleFavorite } = useFavorites();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;

  const defaultUrlPath = (settings?.seriesUrlFormat === 'slug' && series.slug) ? `/series/${series.slug}` : `/series/${series.id}`;
  const seriesUrl = href || `${langPrefix}${defaultUrlPath}`;
  const isFavorite = favoriteIds.has(series.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
        toast({
            variant: 'destructive',
            title: 'Login Required',
            description: 'You need to be logged in to add favorites.',
        });
        return;
    }
    toggleFavorite(series);
  }

  // Fallback to local default image if coverUrl is missing
  const coverImage = series.coverUrl || '/img/no-cover.svg';

  return (
    <div className="group relative flex flex-col">
        {/* Main Navigation Link Overlay */}
        <Link 
            href={seriesUrl} 
            className="absolute inset-0 z-10"
            aria-label={`View ${series.title}`}
        >
            <span className="sr-only">{series.title}</span>
        </Link>

        {/* Visual Content Wrapper */}
        <div className="overflow-hidden rounded-[2rem] relative aspect-[2/3] bg-zinc-900 border border-white/5 shadow-2xl transition-all duration-500 group-hover:border-primary/50 group-hover:shadow-primary/20 group-hover:-translate-y-2">
            <Image
                src={coverImage}
                alt={series.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100 pointer-events-none"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                onError={(e) => {
                    // Alternative way to handle broken remote URLs
                    const target = e.target as HTMLImageElement;
                    target.src = '/img/no-cover.svg';
                }}
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Bottom Info */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-5 z-20 transform translate-y-1 group-hover:translate-y-0 transition-transform duration-500 pointer-events-none">
                <div className="space-y-2">
                    {badgeText && (
                        <Badge className="bg-primary hover:bg-primary border-none text-[8px] font-black rounded-full px-2 py-0 h-4">{badgeText}</Badge>
                    )}
                    <h3 className="font-black text-[13px] md:text-[16px] text-white leading-tight uppercase italic tracking-tighter whitespace-normal break-words">
                        {series.title}
                    </h3>
                </div>
            </div>

            {/* Play Button Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none">
                <div className="h-10 w-10 bg-primary/20 backdrop-blur-xl rounded-full flex items-center justify-center border border-primary/30 scale-150 group-hover:scale-100 transition-transform duration-500">
                    <Play className="h-4 w-4 text-primary fill-current ml-0.5" />
                </div>
            </div>
        </div>

        {/* Top Interactive Area */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-30 pointer-events-auto">
            {series.isPremium ? (
                <div className="bg-amber-400 text-black text-[7px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-xl">
                    <Star className="h-2 w-2 fill-current" /> Premium
                </div>
            ) : (
                <div />
            )}
            <button 
                onClick={handleFavoriteClick}
                className={cn(
                    "h-7 w-7 rounded-xl backdrop-blur-md flex items-center justify-center transition-all duration-300",
                    isFavorite ? "bg-primary text-white shadow-lg shadow-primary/40" : "bg-black/40 text-white hover:bg-primary"
                )}
            >
                <Bookmark className={cn("h-3.5 w-3.5", isFavorite && "fill-current")} />
            </button>
        </div>
    </div>
  );
}
