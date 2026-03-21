'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, Mail, Send, ShieldAlert, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveGeneralSettingsAction } from '@/lib/actions';
import { getGeneralSettings } from '@/lib/data.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';

const securitySchema = z.object({
  mailType: z.enum(['smtp', 'sendmail']).default('smtp').optional(),
  supportEmail: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.coerce.number().optional(),
  smtpUser: z.string().optional(),
  smtpPassword: z.string().optional(),
  smtpEncryption: z.enum(['none', 'ssl', 'tls']).default('tls'),
  maxFailedLoginsPerIp: z.coerce.number().min(1).max(100).default(5),
  maxPasswordResetsPerDay: z.coerce.number().min(1).max(100).default(3),
});
type SecurityFormValues = z.infer<typeof securitySchema>;

export default function SecuritySettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isTestingMail, setIsTestingMail] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const form = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: {
      mailType: 'smtp',
      supportEmail: '',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      smtpEncryption: 'tls',
      maxFailedLoginsPerIp: 5,
      maxPasswordResetsPerDay: 3,
    },
  });

  const selectedMailType = form.watch('mailType');

  const fetchData = async () => {
    setLoading(true);
    const settings = await getGeneralSettings();
    if (settings) {
      form.reset({
        mailType: settings.mailType ?? 'smtp',
        supportEmail: settings.supportEmail ?? '',
        smtpHost: settings.smtpHost ?? '',
        smtpPort: settings.smtpPort ?? 587,
        smtpUser: settings.smtpUser ?? '',
        smtpPassword: settings.smtpPassword ?? '',
        smtpEncryption: settings.smtpEncryption ?? 'tls',
        maxFailedLoginsPerIp: settings.maxFailedLoginsPerIp ?? 5,
        maxPasswordResetsPerDay: settings.maxPasswordResetsPerDay ?? 3,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (values: SecurityFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await saveGeneralSettingsAction(values);
    if (result.success) {
        toast({ title: 'Success', description: 'Security and Mail configuration saved.' });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSaving(false);
  };

  const handleTestMail = async () => {
    if (!testEmail) {
        toast({ variant: 'destructive', title: 'Error', description: 'Please enter a test email address.' });
        return;
    }
    setIsTestingMail(true);
    try {
        const response = await fetch('/api/admin/test-mail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ to: testEmail }),
        });
        const data = await response.json();
        if (response.ok && data.success) {
            toast({ title: 'Success', description: 'Test email sent successfully!' });
        } else {
            toast({ variant: 'destructive', title: 'Error', description: data.error || 'Failed to send test email.' });
        }
    } catch (e: any) {
        toast({ variant: 'destructive', title: 'Error', description: 'Network error while sending test email.' });
    } finally {
        setIsTestingMail(false);
    }
  };

  if (loading) {
      return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Security Settings</h1>
            <p className="text-muted-foreground text-sm">Configure protection limits and system email servers (SMTP).</p>
          </div>
          <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle /> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><ShieldAlert className="h-5 w-5 text-red-500" /> Rate Limiting</CardTitle>
                        <CardDescription>Protect your admin panel from brute force attacks.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <FormField name="maxFailedLoginsPerIp" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Failed Logins per IP / Day</FormLabel>
                                <FormControl><Input type="number" min="1" max="100" {...field} /></FormControl>
                                <FormDescription>Number of incorrect attempts before blocking the IP address for 24 hours.</FormDescription>
                            </FormItem>
                        )}/>
                        <FormField name="maxPasswordResetsPerDay" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Max Password Resets / Day</FormLabel>
                                <FormControl><Input type="number" min="1" max="100" {...field} /></FormControl>
                                <FormDescription>Maximum number of forgot password emails that can be requested per day.</FormDescription>
                            </FormItem>
                        )}/>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Send className="h-4 w-4" /> Send Test Email</CardTitle>
                        <CardDescription>Verify your SMTP configuration.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Recipient Email</label>
                            <Input placeholder="test@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="button" onClick={handleTestMail} disabled={isTestingMail} variant="secondary" className="w-full">
                            {isTestingMail ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                            {isTestingMail ? 'Sending...' : 'Send Test'}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-amber-500" /> Mail Configuration (SMTP)</CardTitle>
                        <CardDescription>Enter your mail server credentials</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-500 mb-4">
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                This SMTP configuration is required for sending the **Admin Forgot Password** reset links.
                            </AlertDescription>
                        </Alert>
                        <FormField name="mailType" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mail Driver</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || 'smtp'}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select mail driver" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="smtp">SMTP Server</SelectItem>
                                        <SelectItem value="sendmail">Sendmail (Local Server)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                        <FormField name="supportEmail" control={form.control} render={({ field }) => (
                            <FormItem>
                                <FormLabel>Support Email</FormLabel>
                                <FormControl><Input placeholder="support@yourdomain.com" {...field} /></FormControl>
                                <FormDescription>The "From" address for system emails.</FormDescription>
                            </FormItem>
                        )}/>
                        
                        {selectedMailType !== 'sendmail' && (
                            <>
                                <FormField name="smtpHost" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Host</FormLabel>
                                        <FormControl><Input placeholder="smtp.gmail.com" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField name="smtpPort" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Port</FormLabel>
                                        <FormControl><Input type="number" placeholder="587" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField name="smtpEncryption" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Encryption</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select encryption" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">None</SelectItem>
                                                <SelectItem value="ssl">SSL (Port 465)</SelectItem>
                                                <SelectItem value="tls">STARTTLS (Port 587)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}/>
                                <FormField name="smtpUser" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Username</FormLabel>
                                        <FormControl><Input placeholder="username" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                                <FormField name="smtpPassword" control={form.control} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SMTP Password</FormLabel>
                                        <FormControl><Input type="password" placeholder="********" {...field} /></FormControl>
                                    </FormItem>
                                )}/>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
      </form>
    </Form>
  );
}
