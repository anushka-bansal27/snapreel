'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, ShieldCheck, Mail, Code, HelpCircle, ExternalLink, Globe, Facebook, Apple, Phone, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveGeneralSettingsAction } from '@/lib/actions';
import { getGeneralSettings } from '@/lib/data.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const authSchema = z.object({
  emailLoginEnabled: z.boolean().default(true),
  googleLoginEnabled: z.boolean().default(true),
  facebookLoginEnabled: z.boolean().default(false),
  appleLoginEnabled: z.boolean().default(false),
  phoneLoginEnabled: z.boolean().default(false),
  signupBonus: z.coerce.number().min(0).default(100),
  
  supportEmail: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpEncryption: z.enum(['none', 'ssl', 'tls']).default('tls'),

  firebaseConfigRaw: z.string().optional(),
  firebaseApiKey: z.string().optional(),
  firebaseAuthDomain: z.string().optional(),
  firebaseProjectId: z.string().optional(),
  firebaseStorageBucket: z.string().optional(),
  firebaseMessagingSenderId: z.string().optional(),
  firebaseAppId: z.string().optional(),
  firebaseMeasurementId: z.string().optional(),
  firebaseServiceAccount: z.string().optional(),
});

type AuthFormValues = z.infer<typeof authSchema>;

export default function AuthSettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
    
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      emailLoginEnabled: true,
      googleLoginEnabled: true,
      facebookLoginEnabled: false,
      appleLoginEnabled: false,
      phoneLoginEnabled: false,
      signupBonus: 100,
      supportEmail: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpEncryption: 'tls',
      firebaseConfigRaw: '',
      firebaseServiceAccount: '',
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const settings = await getGeneralSettings();
    if (settings) {
      form.reset({
        emailLoginEnabled: settings.emailLoginEnabled ?? true,
        googleLoginEnabled: settings.googleLoginEnabled ?? true,
        facebookLoginEnabled: settings.facebookLoginEnabled ?? false,
        appleLoginEnabled: settings.appleLoginEnabled ?? false,
        phoneLoginEnabled: settings.phoneLoginEnabled ?? false,
        signupBonus: settings.signupBonus ?? 100,
        supportEmail: settings.supportEmail ?? '',
        smtpHost: settings.smtpHost ?? '',
        smtpPort: settings.smtpPort ?? 587,
        smtpUser: settings.smtpUser ?? '',
        smtpPassword: settings.smtpPassword ?? '',
        smtpEncryption: settings.smtpEncryption ?? 'tls',
        firebaseConfigRaw: settings.firebaseConfigRaw ?? '',
        firebaseApiKey: settings.firebaseApiKey ?? '',
        firebaseAuthDomain: settings.firebaseAuthDomain ?? '',
        firebaseProjectId: settings.firebaseProjectId ?? '',
        firebaseStorageBucket: settings.firebaseStorageBucket ?? '',
        firebaseMessagingSenderId: settings.firebaseMessagingSenderId ?? '',
        firebaseAppId: settings.firebaseAppId ?? '',
        firebaseMeasurementId: settings.firebaseMeasurementId ?? '',
        firebaseServiceAccount: settings.firebaseServiceAccount ?? '',
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parseFirebaseConfig = (raw: string) => {
    const extract = (key: string) => {
        const regex = new RegExp(`${key}:\\s*["'](.*?)["']`, 'i');
        const match = raw.match(regex);
        return match ? match[1] : '';
    };

    if (!raw.includes('apiKey')) return;

    form.setValue('firebaseApiKey', extract('apiKey'));
    form.setValue('firebaseAuthDomain', extract('authDomain'));
    form.setValue('firebaseProjectId', extract('projectId'));
    form.setValue('firebaseStorageBucket', extract('storageBucket'));
    form.setValue('firebaseMessagingSenderId', extract('messagingSenderId'));
    form.setValue('firebaseAppId', extract('appId'));
    form.setValue('firebaseMeasurementId', extract('measurementId'));
    
    toast({ title: 'Config Parsed!', description: 'Firebase configuration updated.' });
  };

  const onSubmit = async (values: AuthFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await saveGeneralSettingsAction(values);
    if (result.success) {
        toast({ title: 'Success', description: 'Authentication settings saved.' });
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Authentication Settings</h1>
            <p className="text-muted-foreground text-sm">Manage login methods, email servers, and external providers.</p>
          </div>
          <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle /> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Mail className="text-blue-500" /> Login Methods</CardTitle>
                        <CardDescription>Enable or disable authentication providers for your users.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField name="emailLoginEnabled" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel>Email & Password</FormLabel>
                                    <FormDescription>Standard sign-up with email and password.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField name="phoneLoginEnabled" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><Phone className="h-4 w-4 text-green-500"/> Phone Login</FormLabel>
                                    <FormDescription>Allow users to sign in with their phone number via SMS.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField name="googleLoginEnabled" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel>Google Login</FormLabel>
                                    <FormDescription>Allow users to sign in with their Google accounts.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField name="facebookLoginEnabled" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><Facebook className="h-4 w-4 text-blue-600"/> Facebook Login</FormLabel>
                                    <FormDescription>Allow users to sign in with their Facebook accounts.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField name="appleLoginEnabled" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2"><Apple className="h-4 w-4 text-white"/> Apple Login</FormLabel>
                                    <FormDescription>Allow users to sign in with their Apple IDs.</FormDescription>
                                </div>
                                <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                            </FormItem>
                        )}/>
                        <FormField name="signupBonus" control={form.control} render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-primary/5 border-primary/20">
                                <div className="space-y-0.5">
                                    <FormLabel className="flex items-center gap-2">Welcome Bonus</FormLabel>
                                    <FormDescription>Number of coins given to new users upon registration.</FormDescription>
                                </div>
                                <FormControl><Input type="number" className="w-24 text-right font-mono font-bold" {...field} /></FormControl>
                            </FormItem>
                        )}/>
                    </CardContent>
                </Card>

                <Card className="border-primary/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary"><ShieldCheck className="h-5 w-5" /> Firebase Configuration</CardTitle>
                        <CardDescription>Required for Authentication to work. Paste your web config object below.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField name="firebaseConfigRaw" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Code className="h-4 w-4" /> Config Object</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        {...field} 
                                        className="min-h-[250px] font-mono text-[11px] leading-relaxed bg-black/20" 
                                        placeholder={`const firebaseConfig = {\\n  apiKey: "...",\\n  authDomain: "...",\\n  projectId: "...",\\n  ...\\n};`}
                                        onChange={(e) => {
                                            field.onChange(e);
                                            parseFirebaseConfig(e.target.value);
                                        }}
                                    />
                                </FormControl>
                                <FormDescription>Keys will be extracted and saved to MongoDB for client-side use.</FormDescription>
                            </FormItem>
                        )}/>
                        <FormField name="firebaseServiceAccount" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-2"><Code className="h-4 w-4" /> Service Account JSON (Admin SDK)</FormLabel>
                                <FormControl>
                                    <Textarea 
                                        {...field} 
                                        className="min-h-[150px] font-mono text-[11px] leading-relaxed bg-black/20" 
                                        placeholder={`{
  "type": "service_account",
  "project_id": "...",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "...",
  "client_id": "...",
  ...
}`}
                                    />
                                </FormControl>
                                <FormDescription>Required for Web User Forgot Password via Custom SMTP.</FormDescription>
                            </FormItem>
                        )}/>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card className="bg-muted/10">
                    <CardHeader className="pb-3 border-b border-white/5">
                        <CardTitle className="text-sm flex items-center gap-2"><HelpCircle className="h-4 w-4" /> Setup Instructions</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-[700px] p-4">
                            <div className="space-y-8 text-xs leading-relaxed">
                                {/* Firebase Section */}
                                <section className="space-y-3">
                                    <p className="font-bold text-primary flex items-center gap-2 underline underline-offset-4">1. Firebase Setup</p>
                                    <div className="space-y-2 text-muted-foreground">
                                        <p>� Go to <a href="https://console.firebase.google.com/" target="_blank" className="text-blue-400 hover:underline">Firebase Console</a>.</p>
                                        <p>� Create or select your project.</p>
                                        <p>� Add a <strong>Web App</strong> and copy the <code>firebaseConfig</code> object to the box on the left.</p>
                                        <p>� Go to <strong>Authentication &gt; Sign-in method</strong> to enable providers.</p>
                                    </div>
                                </section>

                                <Separator className="bg-white/5" />

                                {/* Facebook Section */}
                                <section className="space-y-3">
                                    <p className="font-bold text-blue-500 flex items-center gap-2">2. Facebook Setup (Meta)</p>
                                    <div className="space-y-2 text-muted-foreground">
                                        <p>� Go to <a href="https://developers.facebook.com/" target="_blank" className="text-blue-400 hover:underline">Meta for Developers</a>.</p>
                                        <p>� Create an App and add <strong>Facebook Login</strong> product.</p>
                                        <p>� In Facebook Settings, get your <strong>App ID</strong> and <strong>App Secret</strong>.</p>
                                        <p>� Copy the <strong>OAuth redirect URI</strong> from Firebase and add it to Facebook "Valid OAuth Redirect URIs".</p>
                                        <p>� Back in Firebase, paste the Facebook credentials under the Facebook provider settings.</p>
                                    </div>
                                </section>

                                <Separator className="bg-white/5" />

                                {/* Apple Section */}
                                <section className="space-y-3">
                                    <p className="font-bold text-white flex items-center gap-2">3. Apple Setup (Developer)</p>
                                    <div className="space-y-2 text-muted-foreground">
                                        <p>� You need an <strong>Apple Developer Program</strong> membership.</p>
                                        <p>� Create an <strong>App ID</strong> with "Sign in with Apple" capability.</p>
                                        <p>� Create a <strong>Services ID</strong> and add your web domain.</p>
                                        <p>� Generate an <strong>Apple Sign-in Key</strong> (.p8 file).</p>
                                        <p>� In Firebase Apple Provider settings, you will need your <strong>Team ID</strong>, <strong>Services ID</strong>, and <strong>Key ID</strong>, and upload the private key.</p>
                                    </div>
                                </section>
                                
                                <Separator className="bg-white/5" />
                                
                                {/* Phone Section */}
                                <section className="space-y-3">
                                    <p className="font-bold text-green-500 flex items-center gap-2">4. Phone Setup (Firebase)</p>
                                    <div className="space-y-2 text-muted-foreground">
                                        <p>� Go to <strong>Firebase Console &gt; Authentication &gt; Sign-in method</strong>.</p>
                                        <p>� Enable the <strong>Phone</strong> provider.</p>
                                        <p>� The system uses invisible reCAPTCHA by default to verify phone numbers.</p>
                                    </div>
                                </section>

                                <Separator className="bg-white/5" />

                                {/* Domain Auth Section */}
                                <section className="space-y-3 bg-amber-500/5 p-3 rounded-lg border border-amber-500/10">
                                    <p className="font-bold flex items-center gap-2 text-amber-500"><Globe className="h-4 w-4"/> 5. Critical Step: Domains</p>
                                    <div className="space-y-2 text-amber-500/80 italic">
                                        <p>Go to <strong>Firebase &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.</p>
                                        <p>Click "Add domain" and enter your website URL: <code>{'yourdomain.com'}</code>.</p>
                                        <p className="font-black text-[10px]">REQUIRED FOR GOOGLE/FACEBOOK/APPLE LOGINS TO WORK!</p>
                                    </div>
                                </section>
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
      </form>
    </Form>
  );
}








