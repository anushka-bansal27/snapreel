import { Skeleton } from '@/components/ui/skeleton';

export const SeriesCarouselSkeleton = ({ title }: { title?: string }) => (
  <div className="space-y-6">
    {title && (
        <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-primary rounded-full" />
            <h2 className="text-2xl font-bold">{title}</h2>
        </div>
    )}
    <div className="flex space-x-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6 flex-shrink-0 space-y-3">
            <Skeleton className="aspect-[2/3] rounded-xl bg-card/80" />
            <Skeleton className="h-4 w-3/4 bg-card/40" />
        </div>
        ))}
    </div>
  </div>
);

export const SeriesGridSkeleton = () => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-8">
    {Array.from({ length: 12 }).map((_, i) => (
      <div key={i} className="space-y-3">
        <Skeleton className="aspect-[2/3] rounded-xl bg-card/80" />
        <Skeleton className="h-4 w-3/4 bg-card/40" />
      </div>
    ))}
    </div>
);

export const HomeLoadingSkeleton = () => (
    <div className="flex flex-col gap-12 pb-20">
        {/* Hero Skeleton */}
        <Skeleton className="h-[65vh] w-full bg-card/20 rounded-none" />
        
        <div className="container mx-auto px-4 space-y-12">
            <SeriesCarouselSkeleton title="New Release" />
            <SeriesCarouselSkeleton title="Trending Now" />
            <SeriesCarouselSkeleton title="Recommended for You" />
        </div>
    </div>
);

export const SeriesDetailSkeleton = () => (
    <div className="bg-background min-h-screen text-foreground pt-20 md:pt-24 relative animate-in fade-in duration-300">
        <div className="container mx-auto px-4 pb-12 relative z-10">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start max-w-7xl mx-auto">
                {/* LEFT: Player column skeleton */}
                <div className="w-full lg:w-[310px] xl:w-[340px] 2xl:w-[360px] shrink-0 space-y-4 mx-auto lg:mx-0">
                    <Skeleton className="aspect-[9/16] bg-white/[0.04] rounded-[2rem] w-full max-w-[310px] xl:max-w-[340px] 2xl:max-w-[360px] max-h-[70vh] lg:max-h-[66vh] mx-auto border border-white/10" />
                    <div className="flex items-center justify-between gap-3 mx-auto w-full max-w-[310px] xl:max-w-[340px] 2xl:max-w-[360px] pt-1">
                        <Skeleton className="flex-1 h-11 rounded-2xl bg-white/[0.04]" />
                        <Skeleton className="flex-1 h-11 rounded-2xl bg-white/[0.04]" />
                    </div>
                </div>

                {/* RIGHT: Info + Episodes column skeleton */}
                <div className="flex-1 min-w-0 space-y-6 lg:pl-2 w-full">
                    <div className="space-y-5 pb-4 border-b border-white/5">
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-20 rounded-full bg-white/[0.06]" />
                            <Skeleton className="h-6 w-24 rounded-full bg-white/[0.06]" />
                        </div>
                        <Skeleton className="h-12 sm:h-14 w-3/4 rounded-xl bg-white/[0.08]" />
                        <div className="flex gap-4 items-center pt-2">
                            <Skeleton className="h-5 w-16 rounded-md bg-white/[0.05]" />
                            <Skeleton className="h-5 w-24 rounded-md bg-white/[0.05]" />
                            <Skeleton className="h-5 w-20 rounded-md bg-white/[0.05]" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full bg-white/[0.04]" />
                        <Skeleton className="h-4 w-5/6 bg-white/[0.04]" />
                        <Skeleton className="h-4 w-2/3 bg-white/[0.04]" />
                    </div>
                    <div className="space-y-4 pt-2">
                        <Skeleton className="h-6 w-32 rounded-md bg-white/[0.06]" />
                        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5">
                            {Array.from({ length: 20 }).map((_, i) => (
                                <Skeleton key={i} className="h-10 sm:h-11 w-full rounded-xl bg-white/[0.05]" />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);
