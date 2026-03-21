'use client';
import React, { useState, useEffect } from 'react';
import type { Ad } from '@/lib/types';
import { getAdSettings } from '@/lib/data.actions';
import { saveAdSettingsAction } from '@/lib/actions';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Megaphone, Gift, FileText, Code, Video } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

function AdField({ id, label, value, onChange, placeholder, isScript = true }: { id: string, label: string, value: string, onChange: (v: string) => void, placeholder?: string, isScript?: boolean }) {
    return (
        <div className="space-y-2">
            <Label htmlFor={id} className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <Megaphone className="h-3 w-3" /> {label}
            </Label>
            {isScript ? (
                <Textarea
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder || '<script>...</script>'}
                    className="min-h-[120px] font-mono text-[11px] bg-black/10 border-muted"
                />
            ) : (
                <Input
                    id={id}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="bg-black/10 border-muted"
                />
            )}
        </div>
    );
}

export default function AdsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Core Settings
    const [adsenseScript, setAdsenseScript] = useState('');
    const [adsTxtContent, setAdsTxtContent] = useState('');
    
    // Video Player Unlock Ad
    const [videoPlayerAd, setVideoPlayerAd] = useState<Partial<Ad>>({
        scriptContent: '',
        dailyWatchLimit: 5,
        skipTimerSeconds: 15,
        isActive: true,
    });

    const fetchData = async () => {
        setLoading(true);
        const [
            adsenseData, adsTxtData, videoAdData
        ] = await Promise.all([
            getAdSettings('adsense_header'),
            getAdSettings('ads_txt'),
            getAdSettings('video_player_ad')
        ]);

        if (adsenseData) setAdsenseScript(adsenseData.scriptContent || '');
        if (adsTxtData) setAdsTxtContent(adsTxtData.scriptContent || '');
        if (videoAdData) setVideoPlayerAd(videoAdData);
        
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async () => {
        setIsSaving(true);
        
        const results = await Promise.all([
            saveAdSettingsAction({ id: 'adsense_header', title: 'AdSense Header', type: 'script', provider: 'google', scriptContent: adsenseScript, isActive: true }),
            saveAdSettingsAction({ id: 'ads_txt', title: 'Ads.txt Content', type: 'script', provider: 'custom', scriptContent: adsTxtContent, isActive: true }),
            saveAdSettingsAction({ ...videoPlayerAd as Ad, id: 'video_player_ad', title: 'Video Player Unlock Ad' })
        ]);

        if (results.every(r => r.success)) {
            toast({ title: 'Ads Updated', description: 'All ad settings saved.' });
        } else {
            const failedResult = results.find(r => !r.success);
            toast({ variant: 'destructive', title: 'Error', description: (failedResult as any)?.error || 'Some settings failed to save.' });
        }
        setIsSaving(false);
    };

    if (loading) return <div className="space-y-6 pt-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Ads Management</h1>
                    <p className="text-muted-foreground">Centralized script and ads.txt control.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} size="lg">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Ads
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-card/50 border-muted">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm flex items-center gap-2"><Code className="h-4 w-4 text-blue-500" /> ADSENSE SCRIPT (HEADER)</CardTitle>
                        <CardDescription className="text-[10px]">Paste the script code provided by Google AdSense.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            value={adsenseScript} 
                            onChange={(e) => setAdsenseScript(e.target.value)}
                            placeholder="<script async src='...'></script>"
                            className="min-h-[150px] font-mono text-[10px] bg-black/20"
                        />
                    </CardContent>
                </Card>

                <Card className="bg-card/50 border-muted">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4 text-green-500" /> ADS.TXT CONTENT</CardTitle>
                        <CardDescription className="text-[10px]">Add your publisher lines here. Accessible at /ads.txt</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea 
                            value={adsTxtContent} 
                            onChange={(e) => setAdsTxtContent(e.target.value)}
                            placeholder="google.com, pub-xxxxxxxxxxxxxxxx, DIRECT, f08c47fec0942fa0"
                            className="min-h-[150px] font-mono text-[10px] bg-black/20"
                        />
                    </CardContent>
                </Card>
            </div>

            <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-500"><Video className="h-5 w-5" /> VIDEO PLAYER UNLOCK AD</CardTitle>
                    <CardDescription>Configuration for ads shown to unlock episodes.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <AdField id="video-player-ad-script" label="VIDEO PLAYER AD SCRIPT" value={videoPlayerAd.scriptContent || ''} onChange={(v) => setVideoPlayerAd(p => ({ ...p, scriptContent: v }))} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label>DAILY WATCH LIMIT</Label>
                            <Input type="number" value={videoPlayerAd.dailyWatchLimit} onChange={(e) => setVideoPlayerAd(p => ({ ...p, dailyWatchLimit: Number(e.target.value) }))} />
                        </div>
                        <div className="space-y-2">
                            <Label>SKIP TIMER (SECONDS)</Label>
                            <Input type="number" value={videoPlayerAd.skipTimerSeconds} onChange={(e) => setVideoPlayerAd(p => ({ ...p, skipTimerSeconds: Number(e.target.value) }))} />
                        </div>
                    </div>
                    <div className="flex items-center space-x-2 p-4 bg-black/10 rounded-lg border">
                        <Switch checked={videoPlayerAd.isActive} onCheckedChange={(v) => setVideoPlayerAd(p => ({ ...p, isActive: v }))} />
                        <Label>Enable Video Player Unlock Ads</Label>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
