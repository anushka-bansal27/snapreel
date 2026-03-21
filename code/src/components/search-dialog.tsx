'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from './ui/input';
import type { Series } from '@/lib/types';
import { Search, Loader2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/lib/settings-provider';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { getAllSeries } from '@/lib/data.actions';

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [query, setQuery] = React.useState('');
  const [allSeries, setAllSeries] = React.useState<Series[]>([]);
  const [loading, setLoading] = React.useState(false);
  const settings = useSettings();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;

  // Fetch series from MongoDB when the dialog is opened
  React.useEffect(() => {
    if (open) {
      setLoading(true);
      getAllSeries(lang).then(data => {
        setAllSeries(data);
        setLoading(false);
      }).catch(err => {
        console.error("Search fetch failed", err);
        setLoading(false);
      });
    } else {
        setQuery(''); // Reset query when closing
    }
  }, [open, lang]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);
  
  const filteredSeries = React.useMemo(() => {
    if (!query || !allSeries) return [];
    return allSeries.filter(series =>
      series.title.toLowerCase().includes(query.toLowerCase())
    );
  }, [query, allSeries]);

  const getSeriesUrl = (series: Series) => {
    const seriesUrlPath = (settings?.seriesUrlFormat === 'slug' && series.slug) ? `/series/${series.slug}` : `/series/${series.id}`;
    return `${langPrefix}${seriesUrlPath}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0 gap-0 border-border/50">
        <DialogHeader className="p-4 border-b border-border/50">
          <DialogTitle className="sr-only">Search Movies & Series</DialogTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a drama series..."
              className="pl-10 h-12 text-lg bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary"
              autoFocus
            />
          </div>
        </DialogHeader>
        <div className="p-4 bg-background">
          <ScrollArea className="h-[400px]">
            {loading ? (
                <div className="flex flex-col justify-center items-center h-[300px] gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground animate-pulse">Loading library...</p>
                </div>
            ) : (
                <>
                    {query && filteredSeries.length === 0 && (
                        <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2">
                            <Search className="h-10 w-10 opacity-20" />
                            <p>No results found for "<span className="text-foreground font-medium">{query}</span>"</p>
                        </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-2">
                        {filteredSeries.map(series => (
                            <Link 
                                key={series.id} 
                                href={getSeriesUrl(series)} 
                                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors group"
                                onClick={() => onOpenChange(false)}
                            >
                                <div className="relative h-16 w-11 rounded-md overflow-hidden flex-shrink-0 shadow-lg">
                                    <Image 
                                        src={series.coverUrl}
                                        alt={series.title}
                                        fill
                                        className="object-cover"
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-foreground group-hover:text-primary transition-colors truncate">{series.title}</p>
                                    <p className="text-xs text-muted-foreground truncate">{(series.genres || []).join(' • ')}</p>
                                </div>
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Search className="h-4 w-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                    
                    {!query && !loading && (
                        <div className="text-center py-20 text-muted-foreground flex flex-col items-center gap-2">
                            <div className="p-4 rounded-full bg-muted/20">
                                <Search className="h-8 w-8" />
                            </div>
                            <p className="font-medium">Search the Universe</p>
                            <p className="text-xs opacity-70">Find your favorite drama series by title</p>
                        </div>
                    )}
                </>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
