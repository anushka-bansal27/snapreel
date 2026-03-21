'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getMobileSettings } from '@/lib/data.actions';
import { generateMobileApiKeyAction, saveMobileSettingsAction } from '@/lib/actions';
import type { MobileSettings } from '@/lib/types';
import { Apple, Copy, ExternalLink, Globe, Loader2, Megaphone, RefreshCw, Save, Settings2, Share2, Smartphone } from 'lucide-react';

const defaults: MobileSettings = {
    apiKey: '',
    privacyPolicyUrl: '',
    termsOfServiceUrl: '',
    rateUsUrl: '',
    updateUrl: '',
    versionCode: 1,
    forceUpdateEnabled: false,
    forceLoginEnabled: false,
    adsProvider: 'admob',
    admobBannerId: '',
    admobBannerEnabled: false,
    admobInterstitialId: '',
    admobInterstitialEnabled: false,
    admobRewardedId: '',
    admobRewardedEnabled: false,
    admobRewardedLimit: 5,
    admobAppOpenId: '',
    admobAppOpenEnabled: false,
    applovinSdkKey: 'YOUR_APPLOVIN_SDK_KEY',
    applovinBannerId: 'applovin_test_banner_id',
    applovinBannerEnabled: false,
    applovinInterstitialId: 'applovin_test_interstitial_id',
    applovinInterstitialEnabled: false,
    applovinRewardedId: 'applovin_test_rewarded_id',
    applovinRewardedEnabled: false,
    facebookBannerId: 'facebook_test_banner_id',
    facebookBannerEnabled: false,
    facebookInterstitialId: 'facebook_test_interstitial_id',
    facebookInterstitialEnabled: false,
    facebookRewardedId: 'facebook_test_rewarded_id',
    facebookRewardedEnabled: false,
    shareLandingTitle: 'Watch {title} on SnapReels',
    shareLandingDescription: 'Stream full HD episodes, exciting short reels, and original dramas on the app or web.',
    androidPackageName: 'com.snapreels.devsnaplix',
    androidPlayStoreUrl: 'https://play.google.com/store/apps/details?id=com.snapreels.devsnaplix',
    iosAppStoreUrl: '',
    iosAppScheme: 'snapreels://',
    enableWebPlayer: true,
    enableAndroidApp: true,
    enableIosApp: true,
    autoOpenApp: false,
};

export default function MobileSettingsPage() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<MobileSettings>(defaults);
    const [apiUrl, setApiUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        getMobileSettings().then(data => {
            setSettings({ ...defaults, ...(data || {}) });
            setApiUrl(`${window.location.origin}/api/mobile/v1`);
            setLoading(false);
        });
    }, []);

    const update = <K extends keyof MobileSettings>(key: K, value: MobileSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const save = async () => {
        setIsSaving(true);
        const result = await saveMobileSettingsAction(settings);
        toast(result.success
            ? { title: 'Android settings saved', description: 'General and AdMob configuration updated.' }
            : { variant: 'destructive', title: 'Save failed', description: result.error });
        setIsSaving(false);
    };

    const generateKey = async () => {
        setIsGenerating(true);
        const result = await generateMobileApiKeyAction();
        if (result.success && result.apiKey) update('apiKey', result.apiKey);
        setIsGenerating(false);
    };

    if (loading) return <div className="space-y-6"><Skeleton className="h-16 w-2/3" /><Skeleton className="h-96 w-full" /></div>;

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-3xl font-black italic tracking-tight uppercase">Mobile App Settings</h1>
                <p className="text-muted-foreground">Configure native app links, updates, API access and mobile ad placements.</p>
            </div>

            <Tabs defaultValue="android" className="space-y-6">
                <TabsList className="grid w-full max-w-2xl grid-cols-3">
                    <TabsTrigger value="android" className="gap-2"><Smartphone className="h-4 w-4" /> Android App</TabsTrigger>
                    <TabsTrigger value="share" className="gap-2"><Share2 className="h-4 w-4" /> Share Page & Deep Links</TabsTrigger>
                    <TabsTrigger value="ios" className="gap-2"><Apple className="h-4 w-4" /> iOS App</TabsTrigger>
                </TabsList>

                <TabsContent value="android">
                    <Tabs defaultValue="general" className="space-y-6">
                        <TabsList>
                            <TabsTrigger value="general" className="gap-2"><Settings2 className="h-4 w-4" /> General</TabsTrigger>
                            <TabsTrigger value="ads" className="gap-2"><Megaphone className="h-4 w-4" /> Ads</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Android General</CardTitle>
                                    <CardDescription>Public links and update information returned to the Android app.</CardDescription>
                                </CardHeader>
                                <CardContent className="grid gap-5 md:grid-cols-2">
                                    <SettingInput label="Privacy Policy Link" value={settings.privacyPolicyUrl || ''} onChange={v => update('privacyPolicyUrl', v)} placeholder="https://example.com/privacy" />
                                    <div className="md:col-span-2 grid gap-5 md:grid-cols-2">
                                        <SettingInput label="Terms Of Service Link" value={settings.termsOfServiceUrl || ''} onChange={v => update('termsOfServiceUrl', v)} placeholder="https://example.com/terms" />
                                        <SettingInput label="Rate Us Link" value={settings.rateUsUrl || ''} onChange={v => update('rateUsUrl', v)} placeholder="https://play.google.com/store/apps/details?id=..." />
                                    </div>
                                    <div className="md:col-span-2 flex items-center justify-between rounded-xl border bg-black/10 p-4">
                                        <div>
                                            <Label className="font-bold">Force Update</Label>
                                            <p className="text-xs text-muted-foreground mt-1">Require users with a lower Android version code to update before entering the app.</p>
                                        </div>
                                        <Switch checked={!!settings.forceUpdateEnabled} onCheckedChange={v => update('forceUpdateEnabled', v)} />
                                    </div>
                                    <div className="md:col-span-2 flex items-center justify-between rounded-xl border bg-black/10 p-4">
                                        <div>
                                            <Label className="font-bold">Force Login / Mandatory Sign In</Label>
                                            <p className="text-xs text-muted-foreground mt-1">Require users to sign in before accessing the app on Android and Flutter. Disables guest mode and skip options.</p>
                                        </div>
                                        <Switch checked={!!settings.forceLoginEnabled} onCheckedChange={v => update('forceLoginEnabled', v)} />
                                    </div>
                                    <SettingInput label="Update Link" value={settings.updateUrl || ''} onChange={v => update('updateUrl', v)} placeholder="https://example.com/app-debug.apk" />
                                    <SettingInput label="Version Code" value={String(settings.versionCode || 1)} onChange={v => update('versionCode', Number(v))} type="number" />
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>API Connection</CardTitle>
                                    <CardDescription>Connection details used by the Android application.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <CopyField label="API Base URL" value={apiUrl} />
                                    <div className="space-y-2">
                                        <Label>API Access Key</Label>
                                        <div className="flex gap-2">
                                            <Input value={settings.apiKey} onChange={e => update('apiKey', e.target.value)} className="font-mono" />
                                            <Button variant="secondary" onClick={generateKey} disabled={isGenerating}>
                                                {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                                <span className="ml-2 hidden sm:inline">Generate</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="ads">
                            <Card className="border-green-500/20 bg-green-500/5">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-green-500" /> Ads Configuration</CardTitle>
                                    <CardDescription>Android ad unit IDs and enable/disable controls for each placement.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="rounded-xl border bg-black/10 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <Label className="font-bold uppercase tracking-wide">Daily Ad Watch Limit</Label>
                                        </div>
                                        <Input
                                            type="number"
                                            value={String(settings.admobRewardedLimit ?? 5)}
                                            onChange={e => update('admobRewardedLimit', Number(e.target.value))}
                                            placeholder="5"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Maximum number of ads a user can watch per day to unlock premium episodes.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Ads Provider</Label>
                                        <Select value={settings.adsProvider || 'admob'} onValueChange={v => update('adsProvider', v as any)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="admob">Google AdMob</SelectItem>
                                                <SelectItem value="applovin">AppLovin MAX</SelectItem>
                                                <SelectItem value="facebook">Facebook Audience Network</SelectItem>
                                                <SelectItem value="multi">Multi Ads (Rotation)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Google AdMob Placements */}
                                    {(settings.adsProvider === 'admob' || settings.adsProvider === 'multi') && (
                                        <div className="space-y-4 pt-4 border-t border-green-500/10">
                                            <Badge variant="secondary" className="mb-2">Google AdMob Placement IDs</Badge>
                                            <AdPlacement label="Banner Ad" value={settings.admobBannerId || ''} enabled={!!settings.admobBannerEnabled} onValue={v => update('admobBannerId', v)} onEnabled={v => update('admobBannerEnabled', v)} />
                                            <AdPlacement label="Interstitial Ad" value={settings.admobInterstitialId || ''} enabled={!!settings.admobInterstitialEnabled} onValue={v => update('admobInterstitialId', v)} onEnabled={v => update('admobInterstitialEnabled', v)} />
                                            <AdPlacement label="Rewarded Ad" value={settings.admobRewardedId || ''} enabled={!!settings.admobRewardedEnabled} onValue={v => update('admobRewardedId', v)} onEnabled={v => update('admobRewardedEnabled', v)} />
                                            <AdPlacement label="App Open Ad (On Launch)" value={settings.admobAppOpenId || ''} enabled={!!settings.admobAppOpenEnabled} onValue={v => update('admobAppOpenId', v)} onEnabled={v => update('admobAppOpenEnabled', v)} />
                                        </div>
                                    )}

                                    {/* AppLovin MAX Placements */}
                                    {(settings.adsProvider === 'applovin' || settings.adsProvider === 'multi') && (
                                        <div className="space-y-4 pt-4 border-t border-green-500/10">
                                            <Badge variant="secondary" className="mb-2">AppLovin MAX Placement IDs</Badge>
                                            <div className="rounded-xl border bg-black/10 p-4 space-y-3">
                                                <Label className="font-bold uppercase tracking-wide">AppLovin SDK Key</Label>
                                                <Input
                                                    value={settings.applovinSdkKey || ''}
                                                    onChange={e => update('applovinSdkKey', e.target.value)}
                                                    placeholder="YOUR_APPLOVIN_SDK_KEY"
                                                />
                                            </div>
                                            <AdPlacement label="Banner Ad Unit ID" value={settings.applovinBannerId || ''} enabled={!!settings.applovinBannerEnabled} onValue={v => update('applovinBannerId', v)} onEnabled={v => update('applovinBannerEnabled', v)} />
                                            <AdPlacement label="Interstitial Ad Unit ID" value={settings.applovinInterstitialId || ''} enabled={!!settings.applovinInterstitialEnabled} onValue={v => update('applovinInterstitialId', v)} onEnabled={v => update('applovinInterstitialEnabled', v)} />
                                            <AdPlacement label="Rewarded Ad Unit ID" value={settings.applovinRewardedId || ''} enabled={!!settings.applovinRewardedEnabled} onValue={v => update('applovinRewardedId', v)} onEnabled={v => update('applovinRewardedEnabled', v)} />
                                        </div>
                                    )}

                                    {/* Facebook Audience Network Placements */}
                                    {(settings.adsProvider === 'facebook' || settings.adsProvider === 'multi') && (
                                        <div className="space-y-4 pt-4 border-t border-green-500/10">
                                            <Badge variant="secondary" className="mb-2">Facebook Audience Network Placement IDs</Badge>
                                            <AdPlacement label="Banner Placement ID" value={settings.facebookBannerId || ''} enabled={!!settings.facebookBannerEnabled} onValue={v => update('facebookBannerId', v)} onEnabled={v => update('facebookBannerEnabled', v)} />
                                            <AdPlacement label="Interstitial Placement ID" value={settings.facebookInterstitialId || ''} enabled={!!settings.facebookInterstitialEnabled} onValue={v => update('facebookInterstitialId', v)} onEnabled={v => update('facebookInterstitialEnabled', v)} />
                                            <AdPlacement label="Rewarded Placement ID" value={settings.facebookRewardedId || ''} enabled={!!settings.facebookRewardedEnabled} onValue={v => update('facebookRewardedId', v)} onEnabled={v => update('facebookRewardedEnabled', v)} />
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                <TabsContent value="share" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Share2 className="h-5 w-5 text-red-500" />
                                Share Landing Page Settings
                            </CardTitle>
                            <CardDescription>
                                Configure the cinematic preview landing page shown when users open shared drama links (/share/[id] or /share/ep/[id]).
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-5 md:grid-cols-2">
                                <SettingInput
                                    label="Page Title Template"
                                    value={settings.shareLandingTitle || ''}
                                    onChange={v => update('shareLandingTitle', v)}
                                    placeholder="Watch {title} on SnapReels"
                                />
                                <SettingInput
                                    label="Page Subtitle / Tagline"
                                    value={settings.shareLandingDescription || ''}
                                    onChange={v => update('shareLandingDescription', v)}
                                    placeholder="Stream full HD episodes, exciting short reels..."
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border bg-black/10 p-4">
                                <div>
                                    <Label className="font-bold">Auto-Launch App on Mobile</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Automatically trigger the deep link intent to open the app when an Android mobile user visits the share link.
                                    </p>
                                </div>
                                <Switch checked={!!settings.autoOpenApp} onCheckedChange={v => update('autoOpenApp', v)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Smartphone className="h-5 w-5 text-emerald-500" />
                                Android Deep Linking & Store Configuration
                            </CardTitle>
                            <CardDescription>
                                Tapping &quot;Open in App&quot; or &quot;Play Store&quot; will open the installed app directly to that specific drama. If not installed, it directs to Google Play.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="grid gap-5 md:grid-cols-2">
                                <SettingInput
                                    label="Android Package Name (Application ID)"
                                    value={settings.androidPackageName || ''}
                                    onChange={v => update('androidPackageName', v)}
                                    placeholder="com.snapreels.devsnaplix"
                                />
                                <SettingInput
                                    label="Google Play Store URL"
                                    value={settings.androidPlayStoreUrl || ''}
                                    onChange={v => update('androidPlayStoreUrl', v)}
                                    placeholder="https://play.google.com/store/apps/details?id=com.snapreels.devsnaplix"
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border bg-black/10 p-4">
                                <div>
                                    <Label className="font-bold">Show &quot;Watch in SnapReels App&quot; Button</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Displays the primary high-converting action button with instant app deep link.
                                    </p>
                                </div>
                                <Switch checked={settings.enableAndroidApp !== false} onCheckedChange={v => update('enableAndroidApp', v)} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Globe className="h-5 w-5 text-blue-500" />
                                Web Player & iOS Linking
                            </CardTitle>
                            <CardDescription>
                                Fallback options for web browsers and Apple iOS devices.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-5">
                            <div className="flex items-center justify-between rounded-xl border bg-black/10 p-4">
                                <div>
                                    <Label className="font-bold">Show &quot;Watch on Website&quot; Button</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Allows users without the app to watch the video directly in their mobile or desktop web browser.
                                    </p>
                                </div>
                                <Switch checked={settings.enableWebPlayer !== false} onCheckedChange={v => update('enableWebPlayer', v)} />
                            </div>

                            <div className="grid gap-5 md:grid-cols-2">
                                <SettingInput
                                    label="Apple App Store URL (iOS)"
                                    value={settings.iosAppStoreUrl || ''}
                                    onChange={v => update('iosAppStoreUrl', v)}
                                    placeholder="https://apps.apple.com/app/id..."
                                />
                                <SettingInput
                                    label="iOS URL Scheme"
                                    value={settings.iosAppScheme || 'snapreels://'}
                                    onChange={v => update('iosAppScheme', v)}
                                    placeholder="snapreels://"
                                />
                            </div>

                            <div className="flex items-center justify-between rounded-xl border bg-black/10 p-4">
                                <div>
                                    <Label className="font-bold">Show &quot;Apple App Store&quot; Button</Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Displays iOS download button if an App Store link is provided.
                                    </p>
                                </div>
                                <Switch checked={settings.enableIosApp !== false} onCheckedChange={v => update('enableIosApp', v)} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ios">
                    <Card className="min-h-72 flex items-center justify-center border-dashed">
                        <CardContent className="text-center pt-6">
                            <Apple className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                            <Badge variant="secondary" className="mb-3">UPCOMING</Badge>
                            <h2 className="text-xl font-bold">iOS App Settings</h2>
                            <p className="text-sm text-muted-foreground mt-2">iOS configuration will be available in a future update.</p>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <CardFooter className="justify-end px-0">
                <Button onClick={save} disabled={isSaving || !settings.apiKey} size="lg">
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Android Settings
                </Button>
            </CardFooter>
        </div>
    );
}

function SettingInput({ label, value, onChange, placeholder, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
    return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} /></div>;
}

function CopyField({ label, value }: { label: string; value: string }) {
    const { toast } = useToast();
    return <div className="space-y-2"><Label>{label}</Label><div className="flex gap-2"><Input readOnly value={value} className="font-mono" /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(value); toast({ title: 'Copied' }); }}><Copy className="h-4 w-4" /></Button></div></div>;
}

function AdPlacement({ label, value, enabled, onValue, onEnabled }: { label: string; value: string; enabled: boolean; onValue: (value: string) => void; onEnabled: (value: boolean) => void }) {
    return <div className="rounded-xl border bg-black/10 p-4 space-y-3"><div className="flex items-center justify-between"><Label className="font-bold uppercase tracking-wide">{label}</Label><div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{enabled ? 'Enabled' : 'Disabled'}</span><Switch checked={enabled} onCheckedChange={onEnabled} /></div></div><Input value={value} onChange={e => onValue(e.target.value)} placeholder="ca-app-pub-xxxxxxxx/yyyyyyyy" className="font-mono" /></div>;
}
