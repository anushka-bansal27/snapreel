'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, CheckCircle, Search, Globe, FileText, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saveGeneralSettingsAction } from '@/lib/actions';
import { getGeneralSettings } from '@/lib/data.actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

const seoSchema = z.object({
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  robotsTxt: z.string().optional(),
});

type SeoFormValues = z.infer<typeof seoSchema>;

export default function SeoSettingsPage() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [siteUrl, setSiteUrl] = useState('');

  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoSchema),
    defaultValues: {
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      robotsTxt: '',
    },
  });

  const fetchData = async () => {
    setLoading(true);
    const settings = await getGeneralSettings();
    if (settings) {
      form.reset({
        seoTitle: settings.seoTitle || '',
        seoDescription: settings.seoDescription || '',
        seoKeywords: settings.seoKeywords || '',
        robotsTxt: settings.robotsTxt || 'User-agent: *\nAllow: /\nSitemap: ' + (settings.siteUrl || '') + '/sitemap.xml',
      });
      setSiteUrl(settings.siteUrl || '');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onSubmit = async (values: SeoFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    const result = await saveGeneralSettingsAction(values);
    if (result.success) {
        toast({ title: 'SEO Settings Saved', description: 'Your site metadata has been updated.' });
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SEO & Metadata</h1>
            <p className="text-muted-foreground text-sm">Configure how search engines index your website.</p>
          </div>
          <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle /> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search className="text-primary" /> General Metadata</CardTitle>
                    <CardDescription>Default tags used across all pages.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <FormField name="seoTitle" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Title</FormLabel>
                            <FormControl><Input {...field} placeholder="SnapReels - Best Dramas" /></FormControl>
                            <FormDescription>Recommended: Max 60 characters.</FormDescription>
                        </FormItem>
                    )}/>
                    <FormField name="seoDescription" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Meta Description</FormLabel>
                            <FormControl><Textarea {...field} placeholder="Explore trending dramas..." className="min-h-[100px]" /></FormControl>
                            <FormDescription>Recommended: Max 160 characters.</FormDescription>
                        </FormItem>
                    )}/>
                    <FormField name="seoKeywords" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel>Keywords</FormLabel>
                            <FormControl><Input {...field} placeholder="drama, series, reels" /></FormControl>
                            <FormDescription>Separate with commas.</FormDescription>
                        </FormItem>
                    )}/>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="text-green-500" /> Crawl & Indexing</CardTitle>
                    <CardDescription>Control search bot behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField name="robotsTxt" control={form.control} render={({ field }) => (
                        <FormItem>
                            <FormLabel className="flex items-center gap-2"><FileText className="h-4 w-4" /> robots.txt</FormLabel>
                            <FormControl><Textarea {...field} className="min-h-[150px] font-mono text-xs" /></FormControl>
                            <FormDescription>Publicly accessible at /robots.txt</FormDescription>
                        </FormItem>
                    )}/>

                    <Separator />

                    <div className="space-y-4">
                        <Label>Useful Links</Label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <a href={`${siteUrl}/sitemap.xml`} target="_blank" className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-2">
                                    <LinkIcon className="h-4 w-4 text-blue-400" />
                                    <span className="text-xs font-bold uppercase">View Sitemap</span>
                                </div>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                            <a href={`${siteUrl}/robots.txt`} target="_blank" className="flex items-center justify-between p-3 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-green-400" />
                                    <span className="text-xs font-bold uppercase">View robots.txt</span>
                                </div>
                                <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
      </form>
    </Form>
  );
}