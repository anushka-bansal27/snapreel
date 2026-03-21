'use client';
import { useUser } from '@/firebase';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { Series, Episode, Ad, MonetizationSettings } from '@/lib/types';
import React, { useMemo, useState, useEffect, useRef, useCallback, memo } from 'react';
import { Lock, Play, Share2, Flag, AlertCircle, Maximize, Minimize, Pause, ChevronLeft, ChevronRight, Settings, Check, ChevronsLeft, ChevronsRight, Heart, Bookmark, Info, Sparkles, Loader2, Volume2, VolumeX, Volume1, MessageCircle, Send, Mail, Copy, Subtitles } from 'lucide-react';
import ReactPlayer from 'react-player/lazy';
import { SeriesCard } from '@/components/series-card';
import { useToast } from '@/hooks/use-toast';
import { UnlockEpisodeDialog } from '@/components/unlock-episode-dialog';
import { ReportDialog } from '@/components/report-dialog';
import { getSecureVideoUrl, incrementSeriesViewAction, toggleLikeSeriesAction, getSeriesLikeStatusAction } from '@/lib/actions';
import { Slider } from '@/components/ui/slider';
import { getSimilarSeries, getMonetizationSettings, getAdSettings } from '@/lib/data.actions';
import { cn, formatCompactNumber } from '@/lib/utils';
import { useSettings } from '@/lib/settings-provider';
import { useTranslation } from '@/lib/translation-provider';
import { useSearchParams } from 'next/navigation';
import { useWatchHistory } from '@/lib/history-provider';
import { useFavorites } from '@/lib/favorites-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SeriesDetailViewProps {
  initialSeries: Series;
  initialEpisodes?: Episode[];
  initialVideoUrl?: string;
}

const formatTime = (seconds: number) => {
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
        return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm}:${ss}`;
};

const EmbedPlayer = memo(({ html }: { html: string }) => (
    <div className="w-full h-full [&>div]:!w-full [&>div]:!h-full [&>div]:!pb-0 [&>div]:!pt-0 [&_iframe]:!w-full [&_iframe]:!h-full [&_iframe]:!absolute [&_iframe]:inset-0" dangerouslySetInnerHTML={{ __html: html }} />
));
EmbedPlayer.displayName = 'EmbedPlayer';

export function SeriesDetailView({ initialSeries, initialEpisodes = [], initialVideoUrl = '' }: SeriesDetailViewProps) {
  const { toast } = useToast();
  const settings = useSettings();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { updateHistory } = useWatchHistory();
  const { toggleFavorite, favoriteIds } = useFavorites();
  const playerRef = useRef<ReactPlayer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interaction Control Refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const series = initialSeries;
  const seriesId = series.id;

  const { user, userProfile, refreshProfile } = useUser();
  const [showUnlockDialog, setShowUnlockDialog] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [episodeToUnlock, setEpisodeToUnlock] = useState<Episode | null>(null);
  
  const [episodes, setEpisodes] = useState<Episode[]>(initialEpisodes);
  const [similarSeries, setSimilarSeries] = useState<Series[]>([]);
  const [episodesLoading, setEpisodesLoading] = useState(initialEpisodes.length === 0);
  const [similarLoading, setSimilarLoading] = useState(true);

  const [monetizationSettings, setMonetizationSettings] = useState<MonetizationSettings | null>(null);
  const [videoAdSettings, setVideoAdSettings] = useState<Ad | null>(null);

  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(initialEpisodes[0] || null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(initialVideoUrl);
  const [isPlaying, setIsPlaying] = useState(!!initialVideoUrl);
  const [duration, setDuration] = useState(0);
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [loadedSeconds, setLoadedSeconds] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [volume, setVolume] = useState(1.0); 
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isRewinding, setIsRewinding] = useState(false);
  const [showEndOverlay, setShowEndOverlay] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const [locallyUnlockedIds, setLocallyUnlockedIds] = useState<Set<string>>(new Set());
  const [seekOnReady, setSeekOnReady] = useState(0);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState(0);

  // Retry Logic
  const [retryCount, setRetryCount] = useState(0);

  const perPage = settings?.episodesPerPage || 15;
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  let finalVideoUrl = currentVideoUrl;
  let isEmbed = currentVideoUrl.includes('<iframe');

  if (!isEmbed && currentVideoUrl) {
      if (currentVideoUrl.includes('dailymotion.com/video/')) {
          const match = currentVideoUrl.match(/video\/([a-zA-Z0-9]+)/);
          if (match) {
              finalVideoUrl = `<iframe src="https://www.dailymotion.com/embed/video/${match[1]}?autoplay=1" width="100%" height="100%" allowfullscreen allow="autoplay" style="border:none;"></iframe>`;
              isEmbed = true;
          }
      } else if (currentVideoUrl.includes('dai.ly/')) {
          const match = currentVideoUrl.match(/dai\.ly\/([a-zA-Z0-9]+)/);
          if (match) {
              finalVideoUrl = `<iframe src="https://www.dailymotion.com/embed/video/${match[1]}?autoplay=1" width="100%" height="100%" allowfullscreen allow="autoplay" style="border:none;"></iframe>`;
              isEmbed = true;
          }
      } else {
          // If video URL is a direct .ts file, route through dynamic HLS virtual manifest so browser can demux and play
          const cleanPath = currentVideoUrl.split('?')[0].toLowerCase();
          if (cleanPath.endsWith('.ts')) {
              finalVideoUrl = `/api/hls?ts=${encodeURIComponent(currentVideoUrl)}&ext=.m3u8`;
          }
      }
  }
  const hasMultipleQualities = (selectedEpisode?.videoSources?.length ?? 0) > 1;
  const isFavorite = favoriteIds.has(seriesId);

  // Like state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState<number>(series.likes ?? 0);
  const [isLikeLoading, setIsLikeLoading] = useState(false);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  // Register local bundled Hls engine globally for ReactPlayer
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('hls.js').then((module) => {
        const Hls = module.default;
        if (Hls && !(window as any).Hls) {
          (window as any).Hls = Hls;
        }
      }).catch(() => {});
    }
  }, []);

  // Sync active text track with HTML5 video element
  useEffect(() => {
    const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement | undefined;
    if (internalPlayer && internalPlayer.textTracks) {
      for (let i = 0; i < internalPlayer.textTracks.length; i++) {
        const track = internalPlayer.textTracks[i];
        if (!subtitlesEnabled) {
          track.mode = 'disabled';
        } else {
          track.mode = (i === selectedSubtitleIndex) ? 'showing' : 'disabled';
        }
      }
    }
  }, [subtitlesEnabled, selectedSubtitleIndex, selectedEpisode?.subtitles]);

  // Reset subtitle index when episode changes
  useEffect(() => {
    setSelectedSubtitleIndex(0);
  }, [selectedEpisode?.id]);

  // Fetch like status for logged-in user
  useEffect(() => {
    if (!user) return;
    getSeriesLikeStatusAction(seriesId, user.uid).then(res => {
      setIsLiked(res.liked);
      setLikesCount(res.likes);
    });
  }, [user, seriesId]);

  const handleLikeClick = useCallback(async () => {
    if (!user) {
      toast({ title: t('common_error'), description: t('series_detail_unlock_login_required'), variant: 'destructive' });
      return;
    }
    if (isLikeLoading) return;
    setIsLikeLoading(true);
    const prevLiked = isLiked;
    const prevCount = likesCount;
    // Optimistic update
    setIsLiked(v => !v);
    setLikesCount(v => prevLiked ? Math.max(0, v - 1) : v + 1);
    const res = await toggleLikeSeriesAction(seriesId, user.uid);
    if (res.success) {
      setIsLiked(res.liked);
      setLikesCount(res.likes);
    } else {
      setIsLiked(prevLiked);
      setLikesCount(prevCount);
    }
    setIsLikeLoading(false);
  }, [user, seriesId, isLiked, likesCount, isLikeLoading, t, toast]);

  const isVipActive = useMemo(() => {
    if (!userProfile?.isVip) return false;
    if (!userProfile.vipExpiry) return true;
    return new Date(userProfile.vipExpiry) > new Date();
  }, [userProfile]);

  const showControlsBriefly = useCallback(() => {
      setShowControls(true);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
          setShowControls(false);
      }, 3000);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRewinding) {
      interval = setInterval(() => {
        const player = playerRef.current;
        if (player) {
          const currentTime = player.getCurrentTime();
          player.seekTo(Math.max(0, currentTime - 0.5), 'seconds');
        }
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isRewinding]);

  useEffect(() => {
    window.scrollTo(0, 0);
    setPlaybackRate(1.0);
    setIsRewinding(false);
    return () => {
        setIsPlaying(false);
        setCurrentVideoUrl('');
        setPlaybackRate(1.0);
        setIsRewinding(false);
        setLoadedSeconds(0);
        setIsBuffering(false);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    };
  }, [seriesId]);

  useEffect(() => {
      showControlsBriefly();
  }, [isPlaying, showControlsBriefly]);

  const handleRetry = useCallback(async () => {
    const source = selectedEpisode?.videoSources?.[currentSourceIndex];
    if (source?.url) {
        setVideoError(false);
        setSeekOnReady(playedSeconds);
        try {
            let url = source.url;
            if (!url.startsWith('/api/') && !url.startsWith('http://') && !url.startsWith('https://')) {
                url = await getSecureVideoUrl(url);
            }
            const uniqueUrl = `${url}${url.includes('?') ? '&' : '?'}retry=${Date.now()}`;
            setCurrentVideoUrl(uniqueUrl);
            setIsPlaying(true);
        } catch (err) {
            console.error("Fetch secure URL failed", err);
            setVideoError(true);
        }
    }
  }, [selectedEpisode, currentSourceIndex, playedSeconds]);

  useEffect(() => {
    incrementSeriesViewAction(seriesId);
    getMonetizationSettings().then(setMonetizationSettings);
    getAdSettings('video_player_ad').then(setVideoAdSettings);
    
    if (initialEpisodes.length === 0) {
        setEpisodesLoading(true);
        import('@/lib/data.actions').then(m => m.getEpisodesForSeries(seriesId)).then(data => {
            const sorted = data.sort((a, b) => a.episodeInSeason - b.episodeInSeason);
            setEpisodes(sorted);
            setEpisodesLoading(false);
            const targetEpNum = searchParams.get('ep');
            const targetEp = targetEpNum ? sorted.find(e => e.episodeInSeason === parseInt(targetEpNum, 10)) : sorted[0];
            if (targetEp) {
                setSelectedEpisode(targetEp);
            }
        });
    } else {
         const targetEpNum = searchParams.get('ep');
         if (targetEpNum) {
            const ep = initialEpisodes.find(e => e.episodeInSeason === parseInt(targetEpNum, 10));
            if (ep) {
                setSelectedEpisode(ep);
            }
         }
    }

    getSimilarSeries(series).then(data => {
      setSimilarSeries(data);
      setSimilarLoading(false);
    });
  }, [seriesId, series, initialEpisodes, searchParams]);

  // Track whether we've already used the server-provided URL
  const initialUrlUsedRef = useRef(false);
  // Store original (raw) URL of the initial episode so we can skip re-fetching
  const initialRawUrlRef = useRef(
    initialEpisodes[0]?.videoSources?.[0]?.url ?? ''
  );

  useEffect(() => {
    // On first mount: use server-provided secure URL immediately (zero client round-trip)
    if (initialVideoUrl && !initialUrlUsedRef.current) {
      initialUrlUsedRef.current = true;
      setCurrentVideoUrl(initialVideoUrl);
      setIsPlaying(true);
      return;
    }

    const source = selectedEpisode?.videoSources?.[currentSourceIndex];
    if (!source?.url) {
      if (selectedEpisode) setCurrentVideoUrl('');
      return;
    }

    // If user switched back to EP1 and it matches the initial raw URL, reuse the cached secure URL
    if (source.url === initialRawUrlRef.current && initialVideoUrl) {
      setVideoError(false);
      setRetryCount(0);
      setPlaybackRate(1.0);
      setIsRewinding(false);
      setCurrentVideoUrl(initialVideoUrl);
      setIsPlaying(true);
      return;
    }

    setVideoError(false);
    setRetryCount(0);
    setPlaybackRate(1.0);
    setIsRewinding(false);
    setDuration(0);

    if (source.url.startsWith('/api/') || source.url.startsWith('http://') || source.url.startsWith('https://')) {
        setCurrentVideoUrl(source.url);
        setIsPlaying(true);
        return;
    }

    getSecureVideoUrl(source.url)
        .then(url => {
            setCurrentVideoUrl(url);
            setIsPlaying(true);
        })
        .catch(() => setVideoError(true));
  }, [selectedEpisode, currentSourceIndex]);


  // Background Pre-caching Engine: Pre-fetch upcoming episode (N+1) so transition is instant on slow networks
  const preloadedUrlsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!selectedEpisode || !isPlaying || playedSeconds < 3 || duration === 0) return;
    const currentIdx = episodes.findIndex(e => e.id === selectedEpisode.id);
    if (currentIdx !== -1 && currentIdx + 1 < episodes.length) {
      const nextEp = episodes[currentIdx + 1];
      const nextSource = nextEp.videoSources?.[0]?.url;
      if (nextSource && !preloadedUrlsRef.current.has(nextEp.id)) {
        preloadedUrlsRef.current.add(nextEp.id);
        getSecureVideoUrl(nextSource).then(url => {
          fetch(url, { headers: { 'range': 'bytes=0-5242880' } }).catch(() => {});
        }).catch(() => {});
      }
    }
  }, [selectedEpisode, isPlaying, playedSeconds, duration, episodes]);

  const syncDuration = useCallback(() => {
    const d = playerRef.current?.getDuration();
    if (d && d > 0 && isFinite(d)) {
      setDuration(prev => Math.abs(prev - d) > 0.5 ? d : prev);
    }
  }, []);

  useEffect(() => {
    const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement | undefined;
    if (internalPlayer && typeof internalPlayer.volume === 'number') {
      internalPlayer.volume = volume;
      internalPlayer.muted = isMuted;
    }
  }, [volume, isMuted]);

  const safePlay = useCallback(() => {
    const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement | undefined;
    if (internalPlayer && typeof internalPlayer.play === 'function') {
      const promise = internalPlayer.play();
      if (promise !== undefined && typeof promise.catch === 'function') {
        promise.catch((err) => {
          console.warn("Play attempt warning:", err);
          if (err.name === 'NotAllowedError' || err.message?.includes('interact') || err.message?.includes('not allowed') || err.message?.includes('gesture')) {
            console.log("Unmuted autoplay blocked by browser. Falling back to muted autoplay.");
            setIsMuted(true);
            internalPlayer.muted = true;
            internalPlayer.play().catch(() => {
              setIsPlaying(false);
            });
          } else {
            setIsPlaying(false);
          }
        });
      }
    }
  }, []);

  const handleVideoError = (error: any) => {
    console.warn("Video playback warning/error:", error);
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setTimeout(() => {
        if (isPlaying) safePlay();
      }, 500);
    } else {
      setVideoError(true);
      setIsPlaying(false);
    }
  };

  const handleUnlockSuccessful = useCallback((episode: Episode) => {
      setLocallyUnlockedIds(prev => new Set([...Array.from(prev), episode.id]));
      setSelectedEpisode(episode);
      setCurrentSourceIndex(0);
      setIsPlaying(true);
  }, []);

  const lastSavedProgressRef = useRef(0);
  const lastEpisodeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user && selectedEpisode && isPlaying && playedSeconds > 0) {
        if (selectedEpisode.id !== lastEpisodeIdRef.current) {
            updateHistory({
                seriesId: series.id,
                episodeId: selectedEpisode.id,
                episodeInSeason: selectedEpisode.episodeInSeason,
                progress: duration > 0 ? (playedSeconds / duration) * 100 : 0
            }, { silent: false });
            lastEpisodeIdRef.current = selectedEpisode.id;
            lastSavedProgressRef.current = playedSeconds;
            return;
        }

        if (playedSeconds > lastSavedProgressRef.current + 30) {
            updateHistory({
                seriesId: series.id,
                episodeId: selectedEpisode.id,
                episodeInSeason: selectedEpisode.episodeInSeason,
                progress: duration > 0 ? (playedSeconds / duration) * 100 : 0
            }, { silent: true });
            lastSavedProgressRef.current = playedSeconds;
        }
    }
  }, [playedSeconds, isPlaying, selectedEpisode, user, series.id, duration, updateHistory]);

  const togglePlayPause = useCallback(() => {
      setIsPlaying(prev => !prev);
      showControlsBriefly();
  }, [showControlsBriefly]);

  const onMasterPointerDown = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const isLeftSide = x < rect.width / 2;

    longPressTimerRef.current = setTimeout(() => {
        if (isLeftSide) {
            setIsRewinding(true);
        } else {
            setPlaybackRate(2.0);
        }
    }, 500);
  };

  const resetPlaybackSpeed = () => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
    setPlaybackRate(1.0);
    setIsRewinding(false);
  };

  const onMasterPointerUp = (e: React.PointerEvent) => {
    if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
    }
    
    if (playbackRate !== 1.0 || isRewinding) {
        setPlaybackRate(1.0);
        setIsRewinding(false);
        return;
    }

    togglePlayPause();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(() => {});
        setIsFullscreen(true);
    } else {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
    }
    showControlsBriefly();
  };
  
  const handleEpisodeNavigation = (direction: 'next' | 'prev') => {
      if (!episodes || !selectedEpisode) return;
      const idx = episodes.findIndex(ep => ep.id === selectedEpisode.id);
      const newIndex = direction === 'next' ? idx + 1 : idx - 1;
      if (newIndex >= 0 && newIndex < episodes.length) handleEpisodeClick(episodes[newIndex]);
      else if (direction === 'next') {
          setShowEndOverlay(true);
          setIsPlaying(false);
      }
  }

  const handleQualityChange = (index: number) => {
    setSeekOnReady(playedSeconds);
    setCurrentSourceIndex(index);
    setIsPlaying(true);
  };

  const handleShare = async () => {
    const shareData = { title: series.title, text: series.description, url: window.location.href };
    if (!navigator.share) {
        setShareSheetOpen(true);
        return;
    }
    try {
        await navigator.share(shareData);
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setShareSheetOpen(true);
    }
  };

  const openShareTarget = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setShareSheetOpen(false);
  };

  const copyShareLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShareSheetOpen(false);
    toast({ title: t('common_success'), description: 'Link copied to clipboard!' });
  };

  const handleFavoriteClick = () => {
    if (!user) {
        toast({ variant: 'destructive', title: 'Login Required', description: 'Please login to save favorites.' });
        return;
    }
    toggleFavorite(series);
  };

  const unlockedEpisodeIdsSet = useMemo(() => {
    const ids = new Set<string>(userProfile?.unlockedEpisodeIds || []);
    locallyUnlockedIds.forEach(id => ids.add(id));
    return ids;
  }, [userProfile, locallyUnlockedIds]);

  const highestUnlockedOrFreeEpisode = useMemo(() => {
    if (!episodes || episodes.length === 0) return 0;
    const freeCount = series?.freeEpisodesCount || 0;
    const highestUnlocked = episodes.reduce((max, ep) => {
        if (unlockedEpisodeIdsSet.has(ep.id)) {
            return Math.max(max, ep.episodeInSeason);
        }
        return max;
    }, 0);
    return Math.max(freeCount, highestUnlocked);
  }, [episodes, unlockedEpisodeIdsSet, series?.freeEpisodesCount]);

  const handleEpisodeClick = useCallback((episode: Episode) => {
    setShowEndOverlay(false);
    const isFree = episode.episodeInSeason <= (series?.freeEpisodesCount || 0);
    const isUnlocked = isFree || isVipActive || unlockedEpisodeIdsSet.has(episode.id);

    if (isUnlocked) {
        if (selectedEpisode?.id !== episode.id) {
            setSelectedEpisode(episode);
            setCurrentSourceIndex(0);
            setDuration(0);
            setPlayedSeconds(0);
            setLoadedSeconds(0);
            setIsBuffering(false);
            lastSavedProgressRef.current = 0;
            setPlaybackRate(1.0);
            setIsRewinding(false);
        }
        setIsPlaying(true);
    } else {
        if (!user) {
            toast({ title: t('common_error'), description: t('series_detail_unlock_login_required'), variant: 'destructive' });
            return;
        }
        if (episode.episodeInSeason > highestUnlockedOrFreeEpisode + 1) {
            toast({
                variant: 'destructive',
                title: t('series_detail_unlock_sequential_title'),
                description: t('series_detail_unlock_sequential_desc', { episodeNumber: highestUnlockedOrFreeEpisode + 1 }),
            });
            return;
        }
        setEpisodeToUnlock(episode);
        setShowUnlockDialog(true);
    }
  }, [series?.freeEpisodesCount, isVipActive, unlockedEpisodeIdsSet, selectedEpisode, user, highestUnlockedOrFreeEpisode, t, toast]);
  
  const currentIndex = episodes.findIndex(ep => ep.id === (selectedEpisode?.id || episodes[0]?.id));
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < episodes.length - 1;
  const pageCount = Math.ceil(episodes.length / perPage);
  const pagesArr = useMemo(() => Array.from({ length: pageCount }, (_, i) => ({ label: `${(i * perPage) + 1}-${Math.min((i + 1) * perPage, episodes.length)}`, startIdx: i * perPage, endIdx: (i + 1) * perPage })), [episodes.length, perPage, pageCount]);
  const visibleEpisodes = useMemo(() => {
      const page = pagesArr[currentPageIndex];
      return page ? episodes.slice(page.startIdx, page.endIdx) : [];
  }, [episodes, currentPageIndex, pagesArr]);

  const clearIndicators = () => {
      setVideoError(false);
      setRetryCount(0);
  };

  // Fallback cover if remote URL is broken
  const coverImage = series.coverUrl || '/img/no-cover.svg';

  return (
    <div className="bg-background min-h-screen text-foreground pt-20 md:pt-24 relative">
      <div className="absolute top-0 left-0 w-full h-[60vh] opacity-30 pointer-events-none overflow-hidden z-0">
          <Image src={coverImage} alt="bg" fill className="object-cover blur-[100px] scale-125" />
      </div>

      <div className="container mx-auto px-4 pb-12 relative z-10">
        {/* ── DESKTOP: side-by-side ── MOBILE: stacked ── */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start max-w-7xl mx-auto">

            {/* LEFT: Video player column */}
            <div className="w-full lg:w-[310px] xl:w-[340px] 2xl:w-[360px] shrink-0 space-y-4 mx-auto lg:mx-0">
                <div className="relative group/player">
                    {/* Ambient Glow background */}
                    <div className="absolute -inset-3 bg-gradient-to-tr from-primary/30 via-rose-500/20 to-purple-600/30 rounded-[2.5rem] blur-2xl opacity-70 group-hover/player:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    <div 
                        ref={containerRef}
                        className="aspect-[9/16] bg-zinc-950/95 rounded-[2rem] relative overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.9)] border border-white/15 backdrop-blur-2xl mx-auto w-full max-w-[310px] xl:max-w-[340px] 2xl:max-w-[360px] max-h-[70vh] lg:max-h-[66vh] select-none z-10"
                        onContextMenu={(e) => e.preventDefault()}
                        onMouseMove={showControlsBriefly}
                    onPointerLeave={resetPlaybackSpeed}
                    onPointerCancel={resetPlaybackSpeed}
                >
                    {!videoError && !isEmbed && currentVideoUrl && (
                        <div 
                            className="absolute inset-0 z-40 cursor-pointer"
                            onPointerDown={onMasterPointerDown}
                            onPointerUp={onMasterPointerUp}
                        />
                    )}
                    
                    {(playbackRate !== 1.0 || isRewinding) && (
                        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 bg-primary/20 backdrop-blur-md px-4 py-1 rounded-full border border-primary/30 animate-pulse pointer-events-none">
                            <span className="text-primary font-black text-xs uppercase tracking-widest">
                                {isRewinding ? '2x Rewind' : `${playbackRate}x Speed`}
                            </span>
                        </div>
                    )}

                    {/* Video Player Watermark Overlay (العلامة المائية) */}
                    {settings?.watermarkEnabled && settings?.watermarkUrl && !videoError && (
                        <div 
                            className={cn(
                                "absolute z-40 pointer-events-none transition-opacity duration-300",
                                settings.watermarkPosition === 'top-left' && "top-4 left-4",
                                settings.watermarkPosition === 'bottom-left' && "bottom-16 left-4",
                                settings.watermarkPosition === 'bottom-right' && "bottom-16 right-4",
                                (!settings.watermarkPosition || settings.watermarkPosition === 'top-right') && "top-4 right-4"
                            )}
                            style={{ opacity: (settings.watermarkOpacity ?? 80) / 100 }}
                        >
                            <img 
                                src={settings.watermarkUrl} 
                                alt="Watermark" 
                                className="h-6 sm:h-7 w-auto max-w-[100px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] select-none"
                            />
                        </div>
                    )}

                    {videoError ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-10 text-center z-[50]">
                            <AlertCircle className="h-12 w-12 text-destructive mb-6 animate-bounce" />
                            <h3 className="text-xl font-black text-white">{t('series_detail_video_unavailable_title')}</h3>
                            <div className="flex gap-4 mt-8">
                                <Button variant="secondary" onClick={() => { setRetryCount(0); handleRetry(); }} className="rounded-full px-8">{t('common_retry')}</Button>
                                <Button variant="ghost" onClick={() => setIsReporting(true)} className="text-destructive hover:bg-destructive/10"><Flag className="mr-2 h-4" /> {t('series_detail_report_button')}</Button>
                            </div>
                        </div>
                    ) : currentVideoUrl ? (
                        isEmbed ? (
                             <EmbedPlayer html={finalVideoUrl} />
                        ) : (
                            <>
                                <ReactPlayer
                                    ref={playerRef}
                                    url={finalVideoUrl}
                                    width="100%"
                                    height="100%"
                                    playing={isPlaying}
                                    volume={volume}
                                    muted={isMuted}
                                    playbackRate={playbackRate}
                                    onDuration={(d) => {
                                        if (d && d > 0 && isFinite(d)) setDuration(d);
                                        else syncDuration();
                                    }}
                                    onProgress={({ playedSeconds, loadedSeconds }) => {
                                        if (!isSeeking) setPlayedSeconds(playedSeconds);
                                        if (typeof loadedSeconds === 'number') setLoadedSeconds(loadedSeconds);
                                        syncDuration();
                                    }}
                                    onBuffer={() => setIsBuffering(true)}
                                    onBufferEnd={() => setIsBuffering(false)}
                                    onEnded={() => handleEpisodeNavigation('next')}
                                    onError={handleVideoError}
                                    progressInterval={250}
                                    onReady={() => {
                                        clearIndicators();
                                        setIsBuffering(false);
                                        syncDuration();
                                        if (seekOnReady > 0) {
                                            playerRef.current?.seekTo(seekOnReady, 'seconds');
                                            setSeekOnReady(0);
                                        }
                                        if (isPlaying) {
                                            safePlay();
                                        }
                                    }}
                                    onStart={() => { clearIndicators(); setIsBuffering(false); syncDuration(); }}
                                    onPlay={() => { clearIndicators(); setIsBuffering(false); syncDuration(); setIsPlaying(true); }}
                                    onPause={() => setIsPlaying(false)}
                                    config={{ 
                                        file: { 
                                            attributes: { controlsList: 'nodownload', preload: 'auto', playsInline: true }, 
                                            forceVideo: true,
                                            forceHLS: finalVideoUrl.includes('.m3u8') || finalVideoUrl.includes('/api/hls'),
                                            hlsOptions: {
                                                enableWorker: true,
                                                lowLatencyMode: true,
                                                backBufferLength: 90
                                            },
                                            tracks: (selectedEpisode?.subtitles && selectedEpisode.subtitles.length > 0)
                                                ? selectedEpisode.subtitles.map((sub, idx) => {
                                                    const url = sub.url || '';
                                                    const cleanSrc = (url.startsWith('/api/subtitles') || url.startsWith('http')) 
                                                        ? url 
                                                        : `/api/subtitles?file=${encodeURIComponent(url)}`;
                                                    return {
                                                        kind: 'subtitles',
                                                        src: cleanSrc,
                                                        srcLang: sub.languageCode || 'en',
                                                        label: sub.language || `Subtitle ${idx + 1}`,
                                                        default: subtitlesEnabled && selectedSubtitleIndex === idx
                                                    };
                                                })
                                                : []
                                        } 
                                    }}
                                    className="absolute inset-0 w-full h-full"
                                />

                                {isBuffering && isPlaying && !videoError && (
                                    <div className="absolute inset-0 z-[48] flex flex-col items-center justify-center pointer-events-none bg-black/30 backdrop-blur-[2px]">
                                        <Loader2 className="h-10 w-10 animate-spin text-primary drop-shadow-md" />
                                    </div>
                                )}
                                
                                {!isPlaying && duration > 0 && (
                                    <div className="absolute inset-0 z-[42] flex items-center justify-center pointer-events-none animate-in fade-in zoom-in duration-300">
                                        <div className="bg-black/40 backdrop-blur-sm p-8 rounded-full border-2 border-white/20 shadow-2xl">
                                            <Play className="h-12 w-12 fill-white text-white ml-1" />
                                        </div>
                                    </div>
                                )}

                                {showEndOverlay && (
                                    <div className="absolute inset-0 z-[60] bg-black/95 flex flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500">
                                        <div className="bg-primary/20 p-6 rounded-full mb-8"><Play className="h-12 w-12 text-primary fill-current" /></div>
                                        <h3 className="text-2xl font-black mb-4 text-white uppercase italic tracking-tighter">Universe Explored!</h3>
                                        <div className="grid grid-cols-2 gap-4 w-full max-sm max-w-sm mt-4">
                                            {similarSeries.slice(0, 2).map(s => <div key={s.id} onClick={e => e.stopPropagation()}><SeriesCard series={s} /></div>)}
                                        </div>
                                        <Button variant="outline" className="mt-10 border-white/20 text-white rounded-full px-10" onClick={() => setShowEndOverlay(false)}>{t('common_close')}</Button>
                                    </div>
                                )}
                                
                                <div className={cn(
                                    "absolute inset-0 z-[45] flex flex-col justify-end transition-opacity duration-500 pointer-events-none",
                                    showControls ? "opacity-100" : "opacity-0"
                                )}>
                                    <div className="bg-gradient-to-t from-black/95 via-black/40 to-transparent p-6 space-y-4 pointer-events-auto pb-10">
                                        <div className="flex items-center gap-3">
                                            <Slider 
                                                value={[playedSeconds]} 
                                                max={duration} 
                                                step={0.1} 
                                                bufferValue={duration > 0 ? (loadedSeconds / duration) * 100 : 0}
                                                onValueChange={v => { setIsSeeking(true); setPlayedSeconds(v[0]); }} 
                                                onValueCommit={v => playerRef.current?.seekTo(v[0], 'seconds')} 
                                                onPointerUp={() => setIsSeeking(false)} 
                                                className="cursor-pointer"
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <button onClick={togglePlayPause} className="text-white hover:text-primary transition-colors p-1">
                                                    {isPlaying ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
                                                </button>
                                                
                                                <div className="flex items-center gap-2">
                                                    <button 
                                                        onClick={() => {
                                                            const nextMuted = !isMuted;
                                                            setIsMuted(nextMuted);
                                                            if (!nextMuted && volume === 0) setVolume(1.0);
                                                            const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement | undefined;
                                                            if (internalPlayer && typeof internalPlayer.muted === 'boolean') {
                                                                internalPlayer.muted = nextMuted;
                                                                if (!nextMuted && typeof internalPlayer.volume === 'number' && volume === 0) {
                                                                    internalPlayer.volume = 1.0;
                                                                }
                                                            }
                                                        }} 
                                                        className="text-white hover:text-primary transition-colors p-1"
                                                    >
                                                        {isMuted || volume === 0 ? <VolumeX className="h-5 w-5" /> : volume < 0.5 ? <Volume1 className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                                    </button>
                                                    <div className="w-20 flex items-center">
                                                        <Slider 
                                                            value={[isMuted ? 0 : Math.round(volume * 100)]} 
                                                            max={100} 
                                                            step={1} 
                                                            onValueChange={(v) => { 
                                                                const newVol = v[0] / 100;
                                                                setVolume(newVol); 
                                                                setIsMuted(newVol === 0);
                                                                const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement | undefined;
                                                                if (internalPlayer) {
                                                                    if (typeof internalPlayer.volume === 'number') internalPlayer.volume = newVol;
                                                                    if (typeof internalPlayer.muted === 'boolean') internalPlayer.muted = (newVol === 0);
                                                                }
                                                            }} 
                                                            onValueCommit={(v) => {
                                                                const newVol = v[0] / 100;
                                                                setVolume(newVol); 
                                                                setIsMuted(newVol === 0);
                                                                const internalPlayer = playerRef.current?.getInternalPlayer() as HTMLVideoElement | undefined;
                                                                if (internalPlayer) {
                                                                    if (typeof internalPlayer.volume === 'number') internalPlayer.volume = newVol;
                                                                    if (typeof internalPlayer.muted === 'boolean') internalPlayer.muted = (newVol === 0);
                                                                }
                                                            }}
                                                            className="cursor-pointer w-20" 
                                                        />
                                                    </div>
                                                </div>

                                                <div className="text-[10px] font-black font-mono text-white/90 tracking-widest bg-black/40 px-3 py-1.5 rounded-full border border-white/10 ml-1">
                                                    {formatTime(playedSeconds)} / {formatTime(duration)}
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                {selectedEpisode?.subtitles && selectedEpisode.subtitles.length > 0 && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button 
                                                                type="button" 
                                                                title={subtitlesEnabled ? "Subtitles ON" : "Subtitles OFF"}
                                                                className={cn(
                                                                    "p-1 transition-colors flex items-center justify-center rounded",
                                                                    subtitlesEnabled 
                                                                        ? "text-primary font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]" 
                                                                        : "text-white/40 hover:text-white/80"
                                                                )}
                                                            >
                                                                <Subtitles className="h-5 w-5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent className="bg-black/95 border-white/10 text-white backdrop-blur-xl min-w-[150px] z-50">
                                                            <DropdownMenuLabel className="text-xs text-white/60 font-semibold tracking-wider uppercase">Subtitles</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-white/10" />
                                                            <DropdownMenuItem 
                                                                onSelect={() => setSubtitlesEnabled(false)}
                                                                className="cursor-pointer flex items-center justify-between text-xs py-2"
                                                            >
                                                                <span>Subtitles Off</span>
                                                                {!subtitlesEnabled && <Check className="h-4 w-4 text-primary" />}
                                                            </DropdownMenuItem>
                                                            {selectedEpisode.subtitles.map((sub, idx) => {
                                                                const isSelected = subtitlesEnabled && selectedSubtitleIndex === idx;
                                                                return (
                                                                    <DropdownMenuItem 
                                                                        key={sub.url + idx}
                                                                        onSelect={() => {
                                                                            setSelectedSubtitleIndex(idx);
                                                                            setSubtitlesEnabled(true);
                                                                        }}
                                                                        className="cursor-pointer flex items-center justify-between text-xs py-2"
                                                                    >
                                                                        <span>{sub.language || `Subtitle ${idx + 1}`}</span>
                                                                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                                                                    </DropdownMenuItem>
                                                                );
                                                            })}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                                {hasMultipleQualities && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild><button className="text-white hover:text-primary p-1"><Settings className="h-5 w-5" /></button></DropdownMenuTrigger>
                                                        <DropdownMenuContent className="bg-black/90 border-white/10 text-white backdrop-blur-xl">
                                                            <DropdownMenuLabel>Quality</DropdownMenuLabel>
                                                            <DropdownMenuSeparator className="bg-white/5" />
                                                            {selectedEpisode?.videoSources?.map((source, index) => (
                                                                <DropdownMenuItem key={source.quality} onSelect={() => handleQualityChange(index)} className="cursor-pointer">
                                                                    {currentSourceIndex === index && <Check className="mr-2 h-3 w-3" />}
                                                                    {source.quality}
                                                                </DropdownMenuItem>
                                                            ))}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                                <button onClick={toggleFullscreen} className="text-white hover:text-primary p-1">
                                                    {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )
                    ) : (
                        // No video yet — show cover poster with play button
                        <div
                            className="w-full h-full relative cursor-pointer group"
                            onClick={() => episodes[0] && handleEpisodeClick(episodes[0])}
                        >
                            <Image
                                src={coverImage}
                                alt={series.title}
                                fill
                                className="object-cover"
                                priority
                            />
                            {/* Dark overlay */}
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors" />
                            {/* Play button */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="bg-white/15 backdrop-blur-xl p-8 rounded-full border-2 border-white/30 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                                    <Play className="h-12 w-12 fill-white text-white ml-1" />
                                </div>
                            </div>
                            {/* Episode label */}
                            <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                                <span className="bg-primary/90 backdrop-blur-sm text-white text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                                    EP 1 — TAP TO WATCH
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

                <div className="flex items-center justify-between gap-3 mx-auto w-full max-w-[310px] xl:max-w-[340px] 2xl:max-w-[360px] relative z-10 pt-1">
                    <Button
                        variant="outline"
                        disabled={!hasPrev}
                        onClick={() => hasPrev && handleEpisodeClick(episodes[currentIndex - 1])}
                        className="flex-1 h-11 rounded-2xl font-black uppercase text-xs tracking-wider border-white/10 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all shadow-md disabled:opacity-30"
                    >
                        <ChevronLeft className="mr-1 h-4 w-4" /> {hasPrev ? `EP ${episodes[currentIndex - 1].episodeInSeason}` : 'START'}
                    </Button>
                    <Button
                        variant="default"
                        onClick={() => handleEpisodeNavigation('next')}
                        className="flex-1 h-11 rounded-2xl font-black uppercase text-xs tracking-wider bg-gradient-to-r from-primary via-rose-600 to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
                    >
                        {hasNext ? `EP ${episodes[currentIndex + 1].episodeInSeason}` : 'FINISH'} <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* RIGHT: Info + Episodes column */}
            <div className="flex-1 min-w-0 space-y-6 lg:pl-2">
                <div className="space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-2 border-b border-white/5">
                        <div className="space-y-3 flex-1 min-w-0">
                            <div className="flex flex-wrap gap-1.5">
                                {series.genres?.map(g => (
                                    <Badge key={g} variant="secondary" className="bg-gradient-to-r from-white/10 to-white/5 border border-white/15 text-white hover:border-primary/50 uppercase text-[9px] font-black tracking-widest px-3 py-1 rounded-full shadow-sm backdrop-blur-md transition-all">
                                        {g}
                                    </Badge>
                                ))}
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white italic tracking-tighter uppercase leading-none bg-gradient-to-r from-white via-white/95 to-white/70 bg-clip-text text-transparent drop-shadow-sm">
                                {series.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-white/60 uppercase tracking-widest pt-1">
                                <span className="bg-white/10 px-2.5 py-0.5 rounded-md text-white font-black">
                                    {(series as any).releaseYear || (series.createdAt ? new Date(series.createdAt as any).getFullYear() : '2024')}
                                </span>
                                <div className="h-1 w-1 bg-primary rounded-full animate-ping" />
                                <span>{episodes.length} Episodes</span>
                                <div className="h-1 w-1 bg-white/30 rounded-full" />
                                <span className="text-primary font-black">{formatCompactNumber(series.views || 0)} Views</span>
                                {isVipActive && (
                                    <>
                                        <div className="h-1 w-1 bg-white/30 rounded-full" />
                                        <Badge className="bg-gradient-to-r from-amber-400 to-amber-500 text-black font-black uppercase text-[9px] px-2.5 py-0.5 rounded-full shadow-lg shadow-amber-500/20 animate-pulse">
                                            VIP ACTIVE
                                        </Badge>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-wrap sm:flex-nowrap gap-2 shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
                            {/* Like button with count */}
                            <button
                                onClick={handleLikeClick}
                                disabled={isLikeLoading}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 h-11 rounded-xl font-extrabold text-xs transition-all duration-300 border backdrop-blur-md flex-1 sm:flex-initial",
                                    isLiked
                                        ? "bg-gradient-to-r from-rose-500/20 to-rose-600/20 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)] scale-105"
                                        : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.1] hover:border-white/20 hover:text-white hover:scale-105 hover:shadow-lg"
                                )}
                            >
                                <Heart className={cn("h-4 w-4 transition-transform", isLiked && "fill-rose-500 text-rose-500 scale-110", isLikeLoading && "animate-pulse")} />
                                <span>{formatCompactNumber(likesCount)}</span>
                            </button>
                            {/* Favorites button */}
                            <button
                                onClick={handleFavoriteClick}
                                className={cn(
                                    "flex items-center justify-center gap-2 px-4 h-11 rounded-xl font-extrabold text-xs transition-all duration-300 border backdrop-blur-md flex-1 sm:flex-initial",
                                    isFavorite
                                        ? "bg-gradient-to-r from-amber-500/20 to-amber-600/20 border-amber-500/50 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105"
                                        : "bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.1] hover:border-white/20 hover:text-white hover:scale-105 hover:shadow-lg"
                                )}
                            >
                                <Bookmark className={cn("h-4 w-4 transition-transform", isFavorite && "fill-amber-500 text-amber-500 scale-110")} />
                                <span>{isFavorite ? 'Saved' : 'Save'}</span>
                            </button>
                            {/* Share button */}
                            <button
                                onClick={handleShare}
                                className="flex items-center justify-center gap-2 px-4 h-11 rounded-xl font-extrabold text-xs transition-all duration-300 border bg-white/[0.04] border-white/10 text-white/70 hover:bg-white/[0.1] hover:border-white/20 hover:text-white hover:scale-105 hover:shadow-lg backdrop-blur-md flex-1 sm:flex-initial"
                            >
                                <Share2 className="h-4 w-4" />
                                <span>Share</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/10 backdrop-blur-xl rounded-2xl p-5 shadow-xl relative overflow-hidden group/synopsis">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary via-rose-500 to-purple-600" />
                        <div className="flex items-center gap-2 text-xs font-black text-white/50 uppercase tracking-[0.2em] mb-3">
                            <Info className="h-3.5 w-3.5 text-primary animate-pulse" /> Synopsis
                        </div>
                        <p className="text-sm sm:text-base text-white/80 leading-relaxed font-normal tracking-wide">{series.description}</p>
                    </div>
                </div>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-6 w-1.5 bg-gradient-to-b from-primary to-rose-600 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">{t('series_detail_episodes_label')}</h2>
                        </div>
                        {pageCount > 1 && (
                            <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/5">
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/70 hover:text-white" onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))} disabled={currentPageIndex === 0}><ChevronLeft className="h-4 w-4"/></Button>
                                <span className="text-[10px] font-black px-2 text-white/60">{currentPageIndex + 1} / {pageCount}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg hover:bg-white/10 text-white/70 hover:text-white" onClick={() => setCurrentPageIndex(prev => Math.min(pageCount - 1, prev + 1))} disabled={currentPageIndex === pageCount - 1}><ChevronRight className="h-4 w-4"/></Button>
                            </div>
                        )}
                    </div>

                    {episodesLoading ? (
                        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5">
                            {Array.from({length: 12}).map((_, i) => <Skeleton key={i} className="h-10 sm:h-11 w-full rounded-xl bg-white/5 animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-8 xl:grid-cols-10 gap-2 sm:gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {visibleEpisodes.map(ep => {
                                const isFree = ep.episodeInSeason <= (series.freeEpisodesCount || 0);
                                const isUnlocked = isFree || isVipActive || unlockedEpisodeIdsSet.has(ep.id);
                                const isActive = selectedEpisode?.id === ep.id;
                                return (
                                    <button
                                        key={ep.id}
                                        onClick={() => handleEpisodeClick(ep)}
                                        className={cn(
                                            "relative h-10 sm:h-11 w-full flex items-center justify-center text-xs sm:text-sm font-extrabold rounded-xl transition-all duration-300 border group/ep overflow-hidden shadow-sm",
                                            isActive
                                                ? "bg-gradient-to-r from-primary via-rose-600 to-purple-600 border-white/50 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)] scale-105 z-10 font-black ring-1 ring-primary/40"
                                                : "bg-white/[0.05] border-white/10 text-white/75 hover:bg-white/[0.15] hover:border-white/30 hover:text-white hover:scale-105 hover:shadow-md",
                                            !isUnlocked && !isActive && "bg-black/50 border-white/[0.05] text-white/30 hover:border-white/10"
                                        )}
                                    >
                                        <span className="flex items-center gap-1">
                                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />}
                                            {ep.episodeInSeason}
                                        </span>
                                        {!isUnlocked && <Lock className="absolute h-3 w-3 top-1 right-1 opacity-50 group-hover/ep:opacity-80 transition-opacity" />}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>

        <div className="pt-24 mt-20 border-t border-white/5">
            <div className="flex items-center gap-3 mb-10">
                <div className="h-10 w-10 bg-primary/10 rounded-2xl flex items-center justify-center"><Sparkles className="h-5 w-5 text-primary" /></div>
                <div><h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{t('series_detail_similar_label')}</h2><p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">More drama awaits in the multiverse</p></div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-8">
                {similarLoading ? Array.from({length: 6}).map((_, i) => <Skeleton key={i} className="aspect-[2/3] rounded-3xl bg-white/5" />) : similarSeries.map(s => <SeriesCard key={s.id} series={s} />)}
            </div>
        </div>
      </div>

      {episodeToUnlock && userProfile && (
        <UnlockEpisodeDialog 
            open={showUnlockDialog} 
            onOpenChange={setShowUnlockDialog} 
            series={series} 
            episode={episodeToUnlock} 
            userProfile={userProfile} 
            monetizationSettings={monetizationSettings} 
            adSettings={videoAdSettings} 
            onUnlockSuccessful={handleUnlockSuccessful} 
        />
      )}
      
      <Dialog open={shareSheetOpen} onOpenChange={setShareSheetOpen}>
        <DialogContent className="border-white/10 bg-zinc-950 text-white shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">Share this drama</DialogTitle>
            <DialogDescription>Choose where you want to share {series.title}.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => openShareTarget(`https://wa.me/?text=${encodeURIComponent(`${series.title} ${window.location.href}`)}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold hover:border-green-500/50 hover:bg-green-500/10"
            >
              <MessageCircle className="h-6 w-6 text-green-500" />
              WhatsApp
            </button>
            <button
              onClick={() => openShareTarget(`https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(series.title)}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold hover:border-sky-500/50 hover:bg-sky-500/10"
            >
              <Send className="h-6 w-6 text-sky-500" />
              Telegram
            </button>
            <button
              onClick={() => openShareTarget(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold hover:border-blue-500/50 hover:bg-blue-500/10"
            >
              <Share2 className="h-6 w-6 text-blue-500" />
              Facebook
            </button>
            <button
              onClick={() => openShareTarget(`https://twitter.com/intent/tweet?text=${encodeURIComponent(series.title)}&url=${encodeURIComponent(window.location.href)}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold hover:border-white/40 hover:bg-white/10"
            >
              <Share2 className="h-6 w-6" />
              X
            </button>
            <button
              onClick={() => openShareTarget(`mailto:?subject=${encodeURIComponent(series.title)}&body=${encodeURIComponent(`${series.description}\n\n${window.location.href}`)}`)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold hover:border-amber-500/50 hover:bg-amber-500/10"
            >
              <Mail className="h-6 w-6 text-amber-500" />
              Email
            </button>
            <button
              onClick={copyShareLink}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-bold hover:border-primary/50 hover:bg-primary/10"
            >
              <Copy className="h-6 w-6 text-primary" />
              Copy Link
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <ReportDialog open={isReporting} onOpenChange={setIsReporting} series={series} episode={selectedEpisode} user={user} userProfile={userProfile} />
    </div>
  );
}
