
'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useUser } from '@/firebase';
import { getRewardTasks, getRewardSettings, getUserClaims } from '@/lib/data.actions';
import { claimRewardAction, performDailyCheckInAction } from '@/lib/actions';
import type { RewardTask, RewardsSettings, UserRewardClaim } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Coins, Megaphone, CheckCircle, ExternalLink, Timer, Loader2, Flame, Info, ChevronLeft, Zap, Gift, Video, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/translation-provider';
import { useRouter } from 'next/navigation';

function RewardTaskItem({ task, claim, onClaimed }: { task: RewardTask, claim?: UserRewardClaim, onClaimed: () => void }) {
    const { user, refreshProfile } = useUser();
    const { toast } = useToast();
    const { t } = useTranslation();
    
    const [showAdDialog, setShowAdDialog] = useState(false);
    const [adCountdown, setAdCountdown] = useState(0);
    const [canSkipAd, setCanSkipAd] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);

    // State for Link Task timer
    const [linkCountdown, setLinkCountdown] = useState(0);
    const [isLinkTimerActive, setIsLinkTimerRunning] = useState(false);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const linkStartTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && isLinkTimerActive && linkStartTimeRef.current) {
                const duration = task.timerSeconds || 10;
                const elapsed = Math.floor((Date.now() - linkStartTimeRef.current) / 1000);
                if (elapsed < duration) {
                    // User returned to the rewards tab too early
                    if (timerRef.current) clearInterval(timerRef.current);
                    setIsLinkTimerRunning(false);
                    setLinkCountdown(0);
                    linkStartTimeRef.current = null;
                    toast({
                        variant: 'destructive',
                        title: 'Task Incomplete',
                        description: `You only stayed on the page for ${Math.max(1, elapsed)}s! You must stay for at least ${duration}s to claim your reward.`
                    });
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isLinkTimerActive, task.timerSeconds]);

    const handleAction = () => {
        if (!user) return;

        if (task.type === 'link') {
            const duration = task.timerSeconds || 10;
            linkStartTimeRef.current = Date.now();
            
            // Open link in new tab
            window.open(task.url, '_blank');
            
            // Start countdown timer on the rewards page
            setLinkCountdown(duration);
            setIsLinkTimerRunning(true);
            
            if (timerRef.current) clearInterval(timerRef.current);
            
            timerRef.current = setInterval(() => {
                setLinkCountdown((prev) => {
                    if (prev <= 1) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        linkStartTimeRef.current = null;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            // Ad Task Logic
            setAdCountdown(task.timerSeconds || 15);
            setCanSkipAd(false);
            setShowAdDialog(true);
            
            const adInterval = setInterval(() => {
                setAdCountdown(prev => {
                    if (prev <= 1) {
                        clearInterval(adInterval);
                        setCanSkipAd(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    };

    const handleClaim = async () => {
        if (!user || isClaiming) return;
        setIsClaiming(true);
        const result = await claimRewardAction(user.uid, task.id);
        if (result.success) {
            toast({ 
                title: t('rewards_toast_claimed_title'), 
                description: t('rewards_toast_claimed_desc', { coins: task.coins }),
                className: "bg-green-600 text-white border-none font-bold"
            });
            refreshProfile();
            onClaimed();
            setShowAdDialog(false);
            setIsLinkTimerRunning(false);
        } else {
            toast({ variant: 'destructive', title: 'Claim Failed', description: result.error });
        }
        setIsClaiming(false);
    };

    return (
        <div className="bg-[#121212] rounded-3xl p-4 flex items-center justify-between border border-white/5 hover:bg-white/5 transition-colors group gap-3">
            <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-14 w-14 bg-amber-400/10 rounded-2xl flex-shrink-0 flex items-center justify-center border border-amber-400/20 group-hover:scale-105 transition-transform">
                    {task.type === 'link' ? (
                        <ExternalLink className="h-7 w-7 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.4)]" />
                    ) : (
                        <Coins className="h-7 w-7 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                    )}
                </div>
                <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-black text-white">+{task.coins} Coins</p>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-tight">
                            {task.title}
                        </p>
                        <span className="flex-shrink-0 bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded text-[8px] font-black text-primary uppercase tracking-tighter">
                            {task.timerSeconds}s
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-shrink-0">
                {isLinkTimerActive ? (
                    <Button 
                        disabled={linkCountdown > 0 || isClaiming}
                        onClick={handleClaim}
                        className={cn(
                            "rounded-full px-6 h-10 font-black text-xs transition-all",
                            linkCountdown > 0 
                                ? "bg-white/10 text-white/40 border border-white/10" 
                                : "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-500/20 animate-pulse"
                        )}
                    >
                        {isClaiming ? <Loader2 className="animate-spin h-4 w-4" /> : linkCountdown > 0 ? t('rewards_wait_seconds', { seconds: linkCountdown }) : t('rewards_claim_now_button')}
                    </Button>
                ) : (
                    <Button 
                        onClick={handleAction} 
                        className="bg-primary hover:bg-primary/90 rounded-full px-8 h-10 font-black text-xs shadow-lg shadow-primary/20"
                    >
                        {t('rewards_go_button')}
                    </Button>
                )}
            </div>

            <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
                <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-black border-none" onPointerDownOutside={e => e.preventDefault()}>
                    <DialogHeader className="sr-only"><DialogTitle>{t('rewards_ad_dialog_title')}</DialogTitle></DialogHeader>
                    <div className="flex flex-col min-h-[60vh] md:min-h-0">
                        {/* Ad Container */}
                        <div className="aspect-video relative bg-black flex items-center justify-center border-b border-white/5">
                            <iframe 
                                srcDoc={`
                                    <!DOCTYPE html>
                                    <html>
                                    <head>
                                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                        <style>
                                            body { margin: 0; padding: 0; background: black; height: 100vh; display: flex; align-items: center; justify-content: center; color: white; color-scheme: dark; font-family: sans-serif; overflow: hidden; }
                                            .loader { border: 4px solid #f3f3f3; border-top: 4px solid #f857a6; border-radius: 50%; width: 40px; height: 40px; animation: spin 2s linear infinite; }
                                            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                                            img, video, iframe { width: 100%; height: 100%; border: 0; object-fit: contain; }
                                        </style>
                                    </head>
                                    <body>
                                        ${task.adScript || '<div class="loader"></div>'}
                                    </body>
                                    </html>
                                `}
                                className="w-full h-full border-0"
                                sandbox="allow-scripts allow-forms allow-popups allow-same-origin allow-presentation"
                                title="Reward Ad"
                            />
                        </div>

                        {/* Interaction Footer */}
                        <div className="p-6 bg-zinc-950 flex flex-col items-center gap-4">
                            {canSkipAd ? (
                                <Button 
                                    onClick={handleClaim} 
                                    disabled={isClaiming} 
                                    className="w-full h-14 bg-[#FF1E56] hover:bg-[#FF1E56]/90 text-white rounded-2xl font-black text-lg shadow-2xl animate-in zoom-in-95"
                                >
                                    {isClaiming ? <Loader2 className="animate-spin h-6 w-6" /> : <><Video className="mr-2" /> {t('rewards_skip_ad_claim_button')}</>}
                                </Button>
                            ) : (
                                <div className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/40 font-black uppercase tracking-widest text-xs gap-3 px-4 text-center">
                                    <Timer className="h-4 w-4 text-primary animate-pulse" />
                                    <span>{t('rewards_ad_watch_to_earn', { coins: task.coins })} ({adCountdown}s)</span>
                                </div>
                            )}
                            <p className="text-[10px] text-muted-foreground italic">{t('rewards_instant_balance_info')}</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function RewardsPage() {
    const { user, userProfile, loading: userLoading, refreshProfile } = useUser();
    const router = useRouter();
    const { t } = useTranslation();
    const { toast } = useToast();
    
    const [tasks, setTasks] = useState<RewardTask[]>([]);
    const [claims, setClaims] = useState<UserRewardClaim[]>([]);
    const [settings, setSettings] = useState<RewardsSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);
        const [tData, sData, cData] = await Promise.all([
            getRewardTasks(),
            getRewardSettings(),
            getUserClaims(user.uid)
        ]);
        setTasks(tData.filter(t => t.isActive));
        setSettings(sData);
        setClaims(cData);
        setLoading(false);
    };

    useEffect(() => {
        if (user) fetchData();
        else if (!userLoading) setLoading(false);
    }, [user, userLoading]);

    const handleDailyCheckIn = async () => {
        if (!user || isCheckingIn) return;
        setIsCheckingIn(true);
        const result = await performDailyCheckInAction(user.uid);
        if (result.success) {
            toast({ 
                title: 'Checked In!', 
                description: `Day ${result.dayNum} reward: +${result.reward} coins.`,
                className: "bg-green-600 text-white border-none font-bold"
            });
            refreshProfile();
            fetchData();
        } else {
            toast({ variant: 'destructive', title: 'Failed', description: result.error });
        }
        setIsCheckingIn(false);
    };

    const availableTasks = useMemo(() => {
        const todayStr = new Date().toDateString();
        return tasks.filter(task => {
            const claim = claims.find(c => c.taskId === task.id);
            if (!claim) return true;
            if (task.frequency === 'once') return false;
            return new Date(claim.claimedAt).toDateString() !== todayStr;
        });
    }, [tasks, claims]);

    if (loading || userLoading) {
        return <div className="container mx-auto max-w-lg min-h-screen flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[0.3em]">Opening Rewards Center...</p>
        </div>;
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const isCheckedInToday = userProfile?.lastCheckInDate === todayDate;
    const currentDay = userProfile?.consecutiveCheckInDays || 0;
    const dailyRewards = settings?.dailyRewards || [10, 20, 30, 40, 50, 60, 70];

    return (
        <div className="container mx-auto max-w-lg min-h-screen bg-background pb-20 pt-20 animate-in fade-in duration-700">
            {/* Custom Header */}
            <div className="flex items-center justify-between px-6 py-8">
                <button onClick={() => router.back()} className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                    <ChevronLeft className="h-6 w-6 text-white" />
                </button>
                <h1 className="text-2xl font-black italic tracking-tighter uppercase text-white">{t('rewards_title')}</h1>
                <button className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                    <Info className="h-5 w-5" />
                </button>
            </div>

            <div className="px-6 space-y-12">
                {/* Daily Check-in Card */}
                <Card className="bg-[#121212] border-white/5 rounded-[2.5rem] p-8 shadow-2xl overflow-hidden relative group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
                    <div className="flex items-center gap-3 mb-8">
                        <div className="h-10 w-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                            <Flame className="h-5 w-5 text-orange-500" />
                        </div>
                        <h2 className="text-lg font-black text-white italic tracking-tighter uppercase">{t('rewards_daily_checkin_title')}</h2>
                    </div>

                    <div className="grid grid-cols-4 gap-3 mb-10">
                        {dailyRewards.map((coins, i) => {
                            const isPast = i < currentDay;
                            const isToday = i === currentDay && !isCheckedInToday;
                            return (
                                <div key={i} className={cn(
                                    "aspect-square rounded-2xl flex flex-col items-center justify-center gap-2 border transition-all duration-300",
                                    isPast ? "bg-amber-400 border-amber-400" : 
                                    isToday ? "bg-amber-400/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.3)] scale-105" :
                                    "bg-white/[0.03] border-white/5"
                                )}>
                                    <Coins className={cn("h-4 w-4", isPast ? "text-black" : "text-amber-400/40")} />
                                    <span className={cn("text-[10px] font-black", isPast ? "text-black" : "text-white/20")}>+{coins}</span>
                                </div>
                            )
                        })}
                    </div>

                    <Button 
                        onClick={handleDailyCheckIn}
                        disabled={isCheckedInToday || isCheckingIn}
                        className={cn(
                            "w-full h-16 rounded-[1.5rem] font-black text-lg uppercase tracking-wider transition-all duration-500",
                            isCheckedInToday ? "bg-white/5 text-white/20 border-none cursor-default" : "bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/30 active:scale-95"
                        )}
                    >
                        {isCheckedInToday ? (
                            <span className="flex items-center gap-2 italic"><CheckCircle className="h-5 w-5" /> {t('rewards_come_back_tomorrow')}</span>
                        ) : isCheckingIn ? (
                            <Loader2 className="animate-spin" />
                        ) : t('rewards_check_in_button')}
                    </Button>
                </Card>

                {/* General Benefits Section */}
                <div className="space-y-8">
                    <div className="flex items-center gap-3">
                        <div className="h-1 bg-primary w-6 rounded-full" />
                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] italic">{t('rewards_general_benefits')}</h3>
                    </div>

                    <div className="flex flex-col gap-4 pb-10">
                        {availableTasks.length === 0 ? (
                            <div className="py-20 text-center space-y-4 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                <Gift className="h-12 w-12 text-white/10 mx-auto" />
                                <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t('rewards_no_tasks_title')}</p>
                            </div>
                        ) : (
                            availableTasks.map(task => {
                                const claim = claims.find(c => c.taskId === task.id);
                                return <RewardTaskItem key={task.id} task={task} claim={claim} onClaimed={fetchData} />;
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
