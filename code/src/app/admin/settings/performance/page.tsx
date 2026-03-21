'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, Zap, Timer, Smartphone, HardDrive, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveGeneralSettingsAction } from '@/lib/actions';
import { getGeneralSettings } from '@/lib/data.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

const performanceSchema = z.object({
  gzipEnabled: z.boolean().default(true),
  pwaEnabled: z.boolean().default(true),
  pwaInstallDelay: z.coerce.number().min(0).max(3600).default(30),
  webpConversionEnabled: z.boolean().default(true),
});

type PerformanceFormValues = z.infer<typeof performanceSchema>;

export default function PerformanceSettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const form = useForm<PerformanceFormValues>({
    resolver: zodResolver(performanceSchema),
    defaultValues: {
      gzipEnabled: true,
      pwaEnabled: true,
      pwaInstallDelay: 30,
      webpConversionEnabled: true,
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const settings = await getGeneralSettings();
    if (settings) {
      form.reset({
        gzipEnabled: settings.gzipEnabled ?? true,
        pwaEnabled: settings.pwaEnabled ?? true,
        pwaInstallDelay: settings.pwaInstallDelay ?? 30,
        webpConversionEnabled: settings.webpConversionEnabled ?? true,
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (values: PerformanceFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await saveGeneralSettingsAction(values);
    if (result.success) {
        toast({ title: 'Settings Saved', description: 'Performance and PWA settings updated.' });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSaving(false);
  };

  if (loading) {
      return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-60 w-full" /></div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Performance & PWA</h1>
            <p className="text-muted-foreground text-sm">Optimize your application's speed and user experience.</p>
          </div>
          <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle /> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Zap className="text-amber-500" /> Speed Optimization</CardTitle>
                    <CardDescription>Tools to make your site load faster.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField name="gzipEnabled" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2"><HardDrive className="h-4 w-4" /> Gzip/Brotli Compression</FormLabel>
                                <FormDescription>Compress assets before sending to the browser.</FormDescription>
                            </div>
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                    
                    <FormField name="webpConversionEnabled" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Enable WebP Image Conversion</FormLabel>
                                <FormDescription>Automatically convert uploaded posters and avatars to WebP format for smaller file sizes.</FormDescription>
                            </div>
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Smartphone className="text-blue-500" /> Progressive Web App (PWA)</CardTitle>
                    <CardDescription>Allow users to install your site as an app.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField name="pwaEnabled" control={form.control} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel>Enable PWA Features</FormLabel>
                                <FormDescription>Activate offline support and install prompts.</FormDescription>
                            </div>
                            <FormControl><Switch checked={!!field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                    )}/>

                    <Separator />

                    <FormField name="pwaInstallDelay" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><Timer className="h-4 w-4" /> Install Prompt Delay (Seconds)</FormLabel>
                            <FormControl><Input type="number" {...field} /></FormControl>
                            <FormDescription>Wait time before showing the install button to visitors.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>
        </div>
      </form>
    </Form>
  );
}
