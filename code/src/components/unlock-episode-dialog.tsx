
'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser } from '@/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { Episode, Series, UserProfile, MonetizationSettings, Ad } from '@/lib/types';
import { Coins, Loader2, Video, X, Timer, CheckCircle, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { unlockEpisodeAction } from '@/lib/actions';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/translation-provider';

interface UnlockEpisodeDialogProps {
  episode: Episode;
  series: Series;
  userProfile: UserProfile | null;
  monetizationSettings: MonetizationSettings | null;
  adSettings: Ad | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlockSuccessful: (episode: Episode) => void;
}

export function UnlockEpisodeDialog(props: UnlockEpisodeDialogProps) {
  const {
    open, onOpenChange, episode, series,
    monetizationSettings, adSettings, onUnlockSuccessful,
  } = props;
  
  const { user, userProfile, refreshProfile } = useUser();
  const { t } = useTranslation();
  
  const [view, setView] = useState<'options' | 'ad'>('options');
  const [isUnlockingCoins, setIsUnlockingCoins] = useState(false);
  const [isUnlockingAd, setIsUnlockingAd] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);

  const { toast } = useToast();

  const isVipActive = useMemo(() => {
    if (!userProfile?.isVip) return false;
    if (!userProfile.vipExpiry) return true;
    return new Date(userProfile.vipExpiry) > new Date();
  }, [userProfile]);

  const isCoinSystemActive = monetizationSettings?.isCoinsActive === undefined ? true : monetizationSettings.isCoinsActive;
  const episodeCost = monetizationSettings?.episodeCost || 50;
  const userCoins = userProfile?.coins || 0;
  const canAfford = userCoins >= episodeCost;

  const unlockedEpisodeIds = useMemo(() => new Set<string>(userProfile?.unlockedEpisodeIds || []), [userProfile]);
  const isAlreadyUnlocked = isVipActive || unlockedEpisodeIds.has(episode.id);

  useEffect(() => {
      if (open && isAlreadyUnlocked) {
          onUnlockSuccessful(episode);
          onOpenChange(false);
      }
  }, [open, isAlreadyUnlocked, episode, onUnlockSuccessful, onOpenChange]);

  const dailyWatchLimit = adSettings?.dailyWatchLimit || 10;
  const adsWatchedToday = userProfile?.todayAdCount ?? 0;
  const hasReachedAdLimit = adsWatchedToday >= dailyWatchLimit;
  const isAdAvailable = adSettings?.isActive && !hasReachedAdLimit;

  useEffect(() => {
    if (open) {
      setView('options');
      setIsUnlockingCoins(false);
      setIsUnlockingAd(false);
    }
  }, [open]);

  useEffect(() => {
    if (view === 'ad' && adSettings) {
      setCanSkip(false);
      setCountdown(adSettings.skipTimerSeconds || 5);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCanSkip(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [view, adSettings]);


  const handleUnlockWithCoins = async () => {
    if (!user || isUnlockingCoins) return;
    if (isAlreadyUnlocked) {
        onUnlockSuccessful(episode);
        onOpenChange(false);
        return;
    }
    if (!canAfford) return;
    
    setIsUnlockingCoins(true);
    
    try {
      const result = await unlockEpisodeAction({
          userId: user.uid,
          seriesId: series.id,
          episodeId: episode.id,
          method: 'coins',
          cost: episodeCost,
          seriesTitle: series.title,
          episodeNumber: episode.episodeInSeason
      });

      if (result.success) {
          onUnlockSuccessful(episode);
          onOpenChange(false);
          toast({ title: t('common_success'), description: t('rewards_toast_claimed_desc', { coins: episodeCost }) });
          refreshProfile(); 
      } else {
          toast({ variant: 'destructive', title: t('common_error'), description: result.error || 'Failed' });
          setIsUnlockingCoins(false);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: t('common_error'), description: 'Server error.' });
      setIsUnlockingCoins(false);
    }
  };

  const handleAdUnlock = async () => {
    if (!user || isUnlockingAd) return;
    setIsUnlockingAd(true);

    try {
      const result = await unlockEpisodeAction({
          userId: user.uid,
          seriesId: series.id,
          episodeId: episode.id,
          method: 'ad',
          seriesTitle: series.title,
          episodeNumber: episode.episodeInSeason
      });

      if (result.success) {
          onUnlockSuccessful(episode);
          onOpenChange(false);
          toast({ title: t('common_success'), description: t('rewards_toast_claimed_title') });
          refreshProfile(); 
      } else {
          toast({ variant: 'destructive', title: t('common_error'), description: result.error });
          setIsUnlockingAd(false);
      }
    } catch (err: any) {
       toast({ variant: 'destructive', title: t('common_error'), description: 'Server error.' });
       setIsUnlockingAd(false);
    }
  }

  if (view === 'ad') {
     return (
       <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black border-none" onPointerDownOutside={(e) => e.preventDefault()}>
            <DialogHeader className="sr-only">
                <DialogTitle>{t('rewards_ad_dialog_title')}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col min-h-[60vh] md:min-h-0">
                <div className="aspect-video relative bg-black flex items-center justify-center border-b border-white/5">
                    <iframe 
                        srcDoc={`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                    body { margin: 0; padding: 0; display: flex; align-items: center; justify-content: center; background: black; height: 100vh; overflow: hidden; color: white; color-scheme: dark; font-family: sans-serif; }
                                    .loader { border: 4px solid #f3f3f3; border-top: 4px solid #f857a6; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; }
                                    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                    img, video, iframe { width: 100%; height: 100%; border: 0; object-fit: contain; }
                                </style>
                            </head>
                            <body>
                                ${adSettings?.scriptContent || '<div class="loader"></div>'}
                            </body>
                            </html>
                        `}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-presentation"
                        title="Video Ad"
                    />
                </div>

                <div className="p-6 bg-zinc-950 flex flex-col items-center gap-4">
                    {canSkip ? (
                        <Button 
                            onClick={handleAdUnlock} 
                            disabled={isUnlockingAd} 
                            className="w-full h-14 bg-[#FF1E56] hover:bg-[#FF1E56]/90 text-white rounded-2xl font-black text-lg shadow-xl animate-in zoom-in-95"
                        >
                             {isUnlockingAd ? <Loader2 className="animate-spin mr-2" /> : <Video className="mr-2" />}
                             {t('unlock_dialog_skip_ad_unlock')}
                        </Button>
                    ) : (
                        <div className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 font-black uppercase tracking-widest text-xs gap-3 px-4 text-center">
                            <Timer className="h-4 w-4 text-primary animate-pulse" />
                            <span>{t('rewards_ad_watch_to_earn', { coins: 0 }).replace('0', '')} ({countdown}s)</span>
                        </div>
                    )}
                    <p className="text-[10px] text-muted-foreground italic">{t('rewards_instant_balance_info')}</p>
                </div>
            </div>
         </DialogContent>
       </Dialog>
     )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-white/5 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black italic tracking-tighter uppercase text-center">{t('unlock_dialog_title', { episodeNumber: episode.episodeInSeason })}</DialogTitle>
          <DialogDescription className="text-xs font-medium text-center text-white/40 mt-1">
            {t('unlock_dialog_desc')}
          </DialogDescription>
        </DialogHeader>
        <div className="py-8 space-y-4">
            {isCoinSystemActive && (
              <Button 
                  className={cn(
                    "w-full h-24 text-lg font-black transition-all duration-300 rounded-[2rem] border-2 group relative overflow-hidden", 
                    isAlreadyUnlocked ? "bg-green-600 border-green-500" : "bg-primary border-primary hover:scale-[1.02] active:scale-95 shadow-xl shadow-primary/20"
                  )}
                  onClick={handleUnlockWithCoins}
                  disabled={isUnlockingCoins || isUnlockingAd || (!canAfford && !isAlreadyUnlocked)}
              >
                  {isUnlockingCoins ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin h-8 w-8" />
                        <span className="text-[10px] font-black uppercase tracking-widest animate-pulse">{t('common_saving')}</span>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center gap-1">
                          {isAlreadyUnlocked ? (
                              <span className="flex items-center gap-2 text-xl"><CheckCircle className="h-6 w-6" /> ALREADY UNLOCKED</span>
                          ) : (
                              <>
                                <div className="flex items-center gap-2 text-xl">
                                    <Sparkles className="h-5 w-5 text-amber-300" />
                                    <span className="uppercase italic tracking-tighter">{t('unlock_dialog_with_coins', { cost: episodeCost })}</span>
                                </div>
                                <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full",
                                    canAfford ? "bg-white/10 text-white/60" : "bg-red-500/20 text-red-400"
                                )}>
                                    {t('unlock_dialog_your_balance', { balance: userCoins.toLocaleString() })}
                                </span>
                              </>
                          )}
                      </div>
                  )}
              </Button>
            )}

            <Button 
                variant="secondary" 
                className="w-full h-20 text-lg font-black rounded-[2rem] border-2 border-white/5 bg-white/5 hover:bg-white/10 transition-all hover:scale-[1.02] active:scale-95"
                onClick={() => setView('ad')}
                disabled={isUnlockingCoins || isUnlockingAd || !isAdAvailable || isAlreadyUnlocked}
            >
                 {isUnlockingAd ? <Loader2 className="animate-spin h-8 w-8" /> : (
                    <div className="flex flex-col items-center gap-0.5">
                        <span className="uppercase italic tracking-tighter text-white/80">{t('unlock_dialog_watch_ad')}</span>
                         <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">
                            {hasReachedAdLimit ? t('unlock_dialog_ad_limit_reached') : t('unlock_dialog_ad_remaining', { count: adsWatchedToday, limit: dailyWatchLimit })}
                        </span>
                    </div>
                )}
            </Button>
        </div>
        <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full text-white/30 font-black uppercase tracking-widest hover:bg-white/5 hover:text-white transition-colors">
                {t('common_cancel')}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
