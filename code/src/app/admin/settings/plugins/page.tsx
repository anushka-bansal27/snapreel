
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, Shield, BarChart, Video, Clock, Sparkles, Key, ExternalLink, Bell, Cpu, Timer, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { savePluginsSettingsAction, testGeminiKeyAction, testGroqKeyAction, testOpenAiKeyAction, testOneSignalAction } from '@/lib/actions';
import { getPluginsSettings } from '@/lib/data.actions';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const formSchema = z.object({
  gaId: z.string().optional(),
  captchaProvider: z.enum(['google', 'cloudflare', 'hcaptcha', 'none']).default('none'),
  recaptchaVersion: z.enum(['v2', 'v3']).default('v2'),
  recaptchaSiteKey: z.string().optional(),
  recaptchaSecretKey: z.string().optional(),
  cloudflareSiteKey: z.string().optional(),
  cloudflareSecretKey: z.string().optional(),
  hcaptchaSiteKey: z.string().optional(),
  hcaptchaSecretKey: z.string().optional(),
  videoProtectionEnabled: z.boolean().default(true),
  videoRotationPeriod: z.enum(['1h', '12h', '24h', '1w', '1mo']).default('24h'),
  aiProvider: z.enum(['groq', 'openai', 'gemini']).default('groq'),
  groqApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  geminiApiKey: z.string().optional(),
  oneSignalAppId: z.string().optional(),
  oneSignalApiKey: z.string().optional(),
  oneSignalPromptDelay: z.coerce.number().min(0).max(3600).default(5),
  indexNowEnabled: z.boolean().default(false),
  indexNowKey: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function PluginsSettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [isTestingOneSignal, setIsTestingOneSignal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gaId: '',
      captchaProvider: 'none',
      recaptchaVersion: 'v2',
      recaptchaSiteKey: '',
      recaptchaSecretKey: '',
      cloudflareSiteKey: '',
      cloudflareSecretKey: '',
      hcaptchaSiteKey: '',
      hcaptchaSecretKey: '',
      videoProtectionEnabled: true,
      videoRotationPeriod: '24h',
      aiProvider: 'groq',
      groqApiKey: '',
      openaiApiKey: '',
      geminiApiKey: '',
      oneSignalAppId: '',
      oneSignalApiKey: '',
      oneSignalPromptDelay: 5,
      indexNowEnabled: false,
      indexNowKey: '',
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const settings = await getPluginsSettings();
    if (settings) {
      const s = settings as any;
      form.reset({
          gaId: s.gaId || '',
          captchaProvider: s.captchaProvider || 'none',
          recaptchaVersion: s.recaptchaVersion || 'v2',
          recaptchaSiteKey: s.recaptchaSiteKey || '',
          recaptchaSecretKey: s.recaptchaSecretKey || '',
          cloudflareSiteKey: s.cloudflareSiteKey || '',
          cloudflareSecretKey: s.cloudflareSecretKey || '',
          hcaptchaSiteKey: s.hcaptchaSiteKey || '',
          hcaptchaSecretKey: s.hcaptchaSecretKey || '',
          videoProtectionEnabled: s.videoProtectionEnabled ?? true,
          videoRotationPeriod: s.videoRotationPeriod || '24h',
          aiProvider: s.aiProvider || 'groq',
          groqApiKey: s.groqApiKey || '',
          openaiApiKey: s.openaiApiKey || '',
          geminiApiKey: s.geminiApiKey || '',
          oneSignalAppId: s.oneSignalAppId || '',
          oneSignalApiKey: s.oneSignalApiKey || '',
          oneSignalPromptDelay: s.oneSignalPromptDelay ?? 5,
          indexNowEnabled: s.indexNowEnabled ?? false,
          indexNowKey: s.indexNowKey || '',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onTestAi = async () => {
      const provider = form.getValues('aiProvider');
      const keyField = provider === 'groq'
          ? 'groqApiKey'
          : provider === 'openai'
            ? 'openaiApiKey'
            : 'geminiApiKey';
      const apiKey = form.getValues(keyField)?.trim();
      
      if (!apiKey) {
          toast({ variant: 'destructive', title: 'Missing Key', description: `Please enter the ${provider.toUpperCase()} API Key first.` });
          return;
      }
      
      setIsTestingAi(true);
      try {
          let result;
          if (provider === 'groq') result = await testGroqKeyAction(apiKey);
          else if (provider === 'openai') result = await testOpenAiKeyAction(apiKey);
          else result = await testGeminiKeyAction(apiKey);

          if (result.success) {
              toast({ title: 'Success', description: result.message });
          } else {
              toast({ variant: 'destructive', title: 'Test Failed', description: result.error });
          }
      } catch (e: any) {
          toast({ variant: 'destructive', title: 'Error', description: e.message || 'Request failed.' });
      } finally {
          setIsTestingAi(false);
      }
  }

  const onTestOneSignal = async () => {
      const appId = form.getValues('oneSignalAppId')?.trim();
      const apiKey = form.getValues('oneSignalApiKey')?.trim();
      
      if (!appId || !apiKey) {
          toast({ variant: 'destructive', title: 'Missing Credentials', description: 'Please enter both App ID and REST API Key.' });
          return;
      }

      setIsTestingOneSignal(true);
      try {
          const result = await testOneSignalAction(appId, apiKey);
          if (result.success) {
              toast({ title: 'Success', description: result.message });
          } else {
              toast({ variant: 'destructive', title: 'Test Failed', description: result.error });
          }
      } catch (e) {
          toast({ variant: 'destructive', title: 'Error', description: 'Request failed.' });
      } finally {
          setIsTestingOneSignal(false);
      }
  }

  const onSubmit = async (values: FormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await savePluginsSettingsAction(values);
    if (result.success) {
        toast({ title: 'Success', description: 'Plugin settings saved successfully.' });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSaving(false);
  };

  if (loading) {
      return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;
  }

  const currentAiProvider = form.watch('aiProvider');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Plugins & Integrations</h1>
            <p className="text-muted-foreground">Manage your site analytics, security, and AI integrations.</p>
          </div>
          <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle /> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Settings Section */}
            <Card className="border-primary/20 bg-primary/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-primary"><Sparkles className="h-5 w-5" /> AI Engine Configuration</CardTitle>
                    <CardDescription>Select and configure your primary AI for translations and metadata.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField name="aiProvider" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Cpu className="h-3 w-3" /> Active AI Provider</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger className="bg-black/20"><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="groq">Groq Cloud (Fast & Multi-Model Auto-Detect)</SelectItem>
                                    <SelectItem value="openai">OpenAI ChatGPT (GPT-4o / GPT-4o-mini / o3-mini)</SelectItem>
                                    <SelectItem value="gemini">Google Gemini (2.5 / 3.5 / 3.8 Flash)</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}/>

                    <Separator className="bg-white/5" />

                    {currentAiProvider === 'groq' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <FormField name="groqApiKey" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="flex items-center gap-2"><Key className="h-3 w-3" /> Groq API Key</FormLabel>
                                        <a href="https://console.groq.com/keys" target="_blank" className="text-[10px] font-bold text-amber-600 hover:underline flex items-center gap-1">
                                            GET FREE KEY <ExternalLink className="h-2 w-2" />
                                        </a>
                                    </div>
                                    <FormControl><Input {...field} type="password" placeholder="gsk_..." className="bg-black/20" /></FormControl>
                                </FormItem>
                             )}/>
                             <p className="text-[10px] text-muted-foreground italic">Note: Powered by Groq Cloud (Qwen / Llama 3.3 / GPT-OSS Auto-Detect).</p>
                        </div>
                    )}

                    {currentAiProvider === 'openai' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <FormField name="openaiApiKey" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="flex items-center gap-2"><Key className="h-3 w-3" /> OpenAI API Key</FormLabel>
                                        <a href="https://platform.openai.com/api-keys" target="_blank" className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                                            GET KEY <ExternalLink className="h-2 w-2" />
                                        </a>
                                    </div>
                                    <FormControl><Input {...field} type="password" placeholder="sk-..." className="bg-black/20" /></FormControl>
                                </FormItem>
                             )}/>
                             <p className="text-[10px] text-muted-foreground italic">Note: Powered by OpenAI ChatGPT (GPT-4o / GPT-4o-mini / o3-mini Auto-Fallback).</p>
                        </div>
                    )}

                    {currentAiProvider === 'gemini' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                             <FormField name="geminiApiKey" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="flex items-center gap-2"><Key className="h-3 w-3" /> Gemini API Key</FormLabel>
                                        <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1">
                                            GET KEY <ExternalLink className="h-2 w-2" />
                                        </a>
                                    </div>
                                    <FormControl><Input {...field} type="password" placeholder="AIza..." className="bg-black/20" /></FormControl>
                                </FormItem>
                             )}/>
                             <p className="text-[10px] text-muted-foreground italic">Model: Google Gemini Flash (Auto-Detect 2.5 / 3.5 / 3.8).</p>
                        </div>
                    )}

                    <Button type="button" variant="outline" size="sm" onClick={onTestAi} disabled={isTestingAi} className="w-full mt-2 border-primary/30 text-primary hover:bg-primary/10">
                        {isTestingAi ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        Test {currentAiProvider.toUpperCase()} Connection
                    </Button>
                </CardContent>
            </Card>

            {/* OneSignal Notifications */}
            <Card className="border-blue-500/20 bg-blue-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-500"><Bell className="h-5 w-5" /> OneSignal Notifications</CardTitle>
                    <CardDescription>Configure push notifications and prompt delay.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField name="oneSignalAppId" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>App ID</FormLabel>
                          <FormControl><Input {...field} placeholder="e.g. xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="bg-black/20" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )}/>
                    <FormField name="oneSignalApiKey" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>REST API Key</FormLabel>
                          <FormControl><Input {...field} type="password" placeholder="os_at_..." className="bg-black/20" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )}/>
                    
                    <Separator className="bg-blue-500/10" />
                    
                    <FormField name="oneSignalPromptDelay" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2"><Timer className="h-4 w-4" /> Prompt Delay (Seconds)</FormLabel>
                          <FormControl><Input {...field} type="number" className="bg-black/20" /></FormControl>
                          <FormDescription className="text-[10px]">Seconds to wait before asking user to "Allow" notifications.</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}/>

                     <Button type="button" variant="outline" size="sm" onClick={onTestOneSignal} disabled={isTestingOneSignal} className="w-full mt-2 border-blue-500/30 text-blue-600 hover:bg-blue-500/10">
                        {isTestingOneSignal ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
                        Test OneSignal Connection
                    </Button>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Google Analytics */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><BarChart className="text-blue-500" /> Google Analytics</CardTitle>
                    <CardDescription>Track visitor behavior with global standard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField name="gaId" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Measurement ID (G-XXXXXXX)</FormLabel>
                          <FormControl><Input {...field} placeholder="G-XXXXXXXXXX" /></FormControl>
                          <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>

            {/* IndexNow SEO */}
            <Card className="border-green-500/20 bg-green-500/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-500"><Globe className="h-5 w-5" /> IndexNow SEO</CardTitle>
                    <CardDescription>Instantly notify search engines of new content.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField name="indexNowEnabled" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border border-green-500/20 bg-black/20 p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable IndexNow</FormLabel>
                                <FormDescription className="text-xs">
                                    Pings Bing/Yandex when dramas are published.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                            </FormControl>
                        </FormItem>
                    )} />
                    <FormField name="indexNowKey" control={form.control} render={({ field }) => (
                        <FormItem>
                          <FormLabel>IndexNow API Key</FormLabel>
                          <FormControl>
                              <div className="flex gap-2">
                                  <Input {...field} placeholder="Random 32-char key" className="bg-black/20" />
                                  <Button type="button" variant="outline" onClick={() => {
                                      const key = Array.from({length: 32}, () => Math.random().toString(36)[2] || 'a').join('');
                                      form.setValue('indexNowKey', key);
                                  }}>Generate</Button>
                              </div>
                          </FormControl>
                          <FormDescription className="text-[10px]">Your key is automatically hosted at /api/indexnow/[key]</FormDescription>
                          <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Video Protection */}
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Video className="text-primary" /> Video Protection</CardTitle>
                    <CardDescription>Dynamic rotation to prevent unauthorized hotlinking.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField name="videoProtectionEnabled" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                              <FormLabel>Enable Protection</FormLabel>
                              <FormDescription className="text-[10px] text-amber-500 font-semibold italic">Note: Only works for UPLOADED videos.</FormDescription>
                          </div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    <FormField name="videoRotationPeriod" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Clock className="h-4 w-4" /> Link Rotation Period</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="1h">Every 1 Hour</SelectItem>
                                    <SelectItem value="12h">Every 12 Hours</SelectItem>
                                    <SelectItem value="24h">Every 24 Hours (Recommended)</SelectItem>
                                    <SelectItem value="1w">Every 1 Week</SelectItem>
                                    <SelectItem value="1mo">Every 1 Month</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormDescription>Expired links will auto-refresh for active users.</FormDescription>
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* CAPTCHA Providers */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Shield className="text-green-500" /> Bot Protection (CAPTCHA)</CardTitle>
                    <CardDescription>Protect your forms from automated spam.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField name="captchaProvider" control={form.control} mt-2 render={({ field }) => (
                        <FormItem>
                            <FormLabel>Active Provider</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="none">None (Disabled)</SelectItem>
                                    <SelectItem value="google">Google reCAPTCHA</SelectItem>
                                    <SelectItem value="cloudflare">Cloudflare Turnstile</SelectItem>
                                    <SelectItem value="hcaptcha">hCaptcha</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )}/>

                    {form.watch('captchaProvider') !== 'none' && <Separator />}

                    {form.watch('captchaProvider') === 'google' && (
                        <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                             <FormField name="recaptchaVersion" control={form.control} render={({ field }) => (
                                <FormItem>
                                    <FormLabel>reCAPTCHA Version</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="v2">v2 Checkbox (I am not a robot)</SelectItem>
                                            <SelectItem value="v3">v3 Invisible (Score based)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </FormItem>
                            )}/>
                            <FormField name="recaptchaSiteKey" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>reCAPTCHA Site Key</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>
                            )}/>
                            <FormField name="recaptchaSecretKey" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>reCAPTCHA Secret Key</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>
                            )}/>
                        </div>
                    )}

                    {form.watch('captchaProvider') === 'cloudflare' && (
                        <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">Cloudflare Turnstile credentials</p>
                                <a href="https://dash.cloudflare.com/?to=/:account/turnstile" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline flex items-center gap-1">
                                    GET KEYS <ExternalLink className="h-2 w-2" />
                                </a>
                            </div>
                            <FormField name="cloudflareSiteKey" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Turnstile Site Key</FormLabel><FormControl><Input {...field} placeholder="0x4AAAAAAA..." /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="cloudflareSecretKey" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>Turnstile Secret Key</FormLabel><FormControl><Input type="password" {...field} placeholder="0x4AAAAAAA..." /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    )}

                    {form.watch('captchaProvider') === 'hcaptcha' && (
                        <div className="grid grid-cols-1 gap-4 animate-in fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">hCaptcha credentials</p>
                                <a href="https://dashboard.hcaptcha.com/sites" target="_blank" rel="noreferrer" className="text-[10px] font-bold text-violet-500 hover:underline flex items-center gap-1">
                                    GET KEYS <ExternalLink className="h-2 w-2" />
                                </a>
                            </div>
                            <FormField name="hcaptchaSiteKey" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>hCaptcha Site Key</FormLabel><FormControl><Input {...field} placeholder="Site key" /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField name="hcaptchaSecretKey" control={form.control} render={({ field }) => (
                                <FormItem><FormLabel>hCaptcha Secret Key</FormLabel><FormControl><Input type="password" {...field} placeholder="Secret key" /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
      </form>
    </Form>
  );
}
