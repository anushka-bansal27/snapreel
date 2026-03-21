'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Server, UploadCloud, CheckCircle, Smartphone, ExternalLink } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { getStorageSettings, getDemoModeStatus } from '@/lib/data.actions';
import { saveStorageSettingsAction, testStorageConnectionAction } from '@/lib/actions';
import { Skeleton } from '@/components/ui/skeleton';

const storageFormSchema = z.object({
  activeProvider: z.enum(['local', 'digitalocean', 's3', 'gcs', 'backblaze', 'bunny']).default('local'),
  videoUploadMaxSizeMb: z.coerce.number().min(1).default(100),
  digitalocean: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    endpoint: z.string().optional(),
    bucket: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
  s3: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    bucket: z.string().optional(),
    region: z.string().optional(),
  }).optional(),
  gcs: z.object({
    accessKeyId: z.string().optional(),
    secretAccessKey: z.string().optional(),
    bucket: z.string().optional(),
  }).optional(),
  backblaze: z.object({
    applicationKeyId: z.string().optional(),
    applicationKey: z.string().optional(),
    bucket: z.string().optional(),
    endpoint: z.string().optional(),
  }).optional(),
  bunny: z.object({
    storageZoneName: z.string().optional(),
    apiKey: z.string().optional(),
    region: z.string().optional(),
    pullZoneUrl: z.string().optional(),
  }).optional(),
});

type StorageFormValues = z.infer<typeof storageFormSchema>;

export default function StorageSettingsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const form = useForm<StorageFormValues>({
    resolver: zodResolver(storageFormSchema),
    defaultValues: {
      activeProvider: 'local',
      videoUploadMaxSizeMb: 100,
      digitalocean: { accessKeyId: '', secretAccessKey: '', endpoint: '', bucket: '', region: '' },
      s3: { accessKeyId: '', secretAccessKey: '', bucket: '', region: '' },
      gcs: { accessKeyId: '', secretAccessKey: '', bucket: '' },
      backblaze: { applicationKeyId: '', applicationKey: '', bucket: '', endpoint: '' },
      bunny: { storageZoneName: '', apiKey: '', region: '', pullZoneUrl: '' },
    },
  });

  useEffect(() => {
    getStorageSettings().then(settings => {
        if (settings) {
            form.reset({
                ...settings,
                videoUploadMaxSizeMb: settings.videoUploadMaxSizeMb || 100,
            });
        }
        setLoading(false);
    });
    getDemoModeStatus().then(setIsDemoMode);
  }, [form]);

  const handleTest = async (provider: string) => {
      const values = form.getValues();
      const config = values[provider as keyof StorageFormValues];
      
      if (provider !== 'local' && (!config || typeof config !== 'object')) {
          toast({ variant: 'destructive', title: 'Error', description: 'Please fill in the configuration first.' });
          return;
      }

      setIsTesting(provider);
      const result = await testStorageConnectionAction(provider, config);
      if (result.success) {
          toast({ title: 'Success', description: result.message });
      } else {
          toast({ variant: 'destructive', title: 'Test Failed', description: result.error });
      }
      setIsTesting(null);
  }

  const onSubmit = async (values: StorageFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    
    const result = await saveStorageSettingsAction(values) as any;
    if (result.success) {
        toast({ title: 'Success', description: 'Storage settings saved.' });
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    } else {
        toast({ variant: 'destructive', title: 'Error', description: result.error });
    }
    setIsSaving(false);
  };

  if (loading) return <div className="space-y-6"><Skeleton className="h-40 w-full" /><Skeleton className="h-80 w-full" /></div>;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Storage Settings</h1>
            <p className="text-muted-foreground">Configure where your media files are stored.</p>
          </div>
          <Button type="submit" disabled={isSaving} className={cn(saveSuccess && 'bg-green-500 hover:bg-green-600')}>
            {isSaving ? <Loader2 className="animate-spin" /> : saveSuccess ? <CheckCircle /> : <Save />}
            {saveSuccess ? 'Saved!' : 'Save Changes'}
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Global Storage Settings</CardTitle>
            <CardDescription>Configure file size limits and the active storage provider.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
                control={form.control}
                name="videoUploadMaxSizeMb"
                render={({ field }) => (
                    <FormItem className="max-w-xs">
                        <FormLabel>Max Video Upload Size (MB)</FormLabel>
                        <FormControl>
                            <Input type="number" {...field} disabled={isDemoMode} />
                        </FormControl>
                        <FormDescription>
                            {isDemoMode ? "This setting is disabled in demo mode." : "Set the limit for a single video file upload."}
                        </FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
              control={form.control}
              name="activeProvider"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Active Storage Provider</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4"
                    >
                      <FormItem>
                        <FormControl><RadioGroupItem value="local" id="local" className="sr-only" /></FormControl>
                        <Label htmlFor="local" className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent cursor-pointer ${field.value === 'local' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <Server className="mb-3 h-6 w-6" /> Local Server
                        </Label>
                      </FormItem>
                      <FormItem>
                        <FormControl><RadioGroupItem value="digitalocean" id="digitalocean" className="sr-only" /></FormControl>
                         <Label htmlFor="digitalocean" className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent cursor-pointer ${field.value === 'digitalocean' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <UploadCloud className="mb-3 h-6 w-6" /> DigitalOcean
                        </Label>
                      </FormItem>
                       <FormItem>
                        <FormControl><RadioGroupItem value="s3" id="s3" className="sr-only" /></FormControl>
                         <Label htmlFor="s3" className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent cursor-pointer ${field.value === 's3' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <UploadCloud className="mb-3 h-6 w-6" /> Amazon S3
                        </Label>
                      </FormItem>
                      <FormItem>
                        <FormControl><RadioGroupItem value="gcs" id="gcs" className="sr-only" /></FormControl>
                         <Label htmlFor="gcs" className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent cursor-pointer ${field.value === 'gcs' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <UploadCloud className="mb-3 h-6 w-6" /> Google Cloud
                        </Label>
                      </FormItem>
                       <FormItem>
                        <FormControl><RadioGroupItem value="backblaze" id="backblaze" className="sr-only" /></FormControl>
                         <Label htmlFor="backblaze" className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent cursor-pointer ${field.value === 'backblaze' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <UploadCloud className="mb-3 h-6 w-6" /> Backblaze B2
                        </Label>
                      </FormItem>
                      <FormItem>
                        <FormControl><RadioGroupItem value="bunny" id="bunny" className="sr-only" /></FormControl>
                         <Label htmlFor="bunny" className={`flex flex-col items-center justify-center rounded-md border-2 p-4 hover:bg-accent cursor-pointer ${field.value === 'bunny' ? 'border-primary bg-primary/5' : 'border-muted'}`}>
                          <UploadCloud className="mb-3 h-6 w-6 text-pink-500" /> Bunny.net
                        </Label>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Accordion type="single" collapsible className="w-full space-y-4">
            <AccordionItem value="digitalocean" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline bg-muted/20">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">DigitalOcean Spaces Configuration</div>
                        <a href="https://cloud.digitalocean.com/account/api/tokens" target="_blank" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold">GET KEYS <ExternalLink className="h-2 w-2" /></a>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="digitalocean.accessKeyId" control={form.control} render={({field}) => (<FormItem><FormLabel>Access Key ID</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField name="digitalocean.secretAccessKey" control={form.control} render={({field}) => (<FormItem><FormLabel>Secret Access Key</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField name="digitalocean.bucket" control={form.control} render={({field}) => (<FormItem><FormLabel>Bucket/Space Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField name="digitalocean.region" control={form.control} render={({field}) => (<FormItem><FormLabel>Region</FormLabel><FormControl><Input {...field} placeholder="nyc3" /></FormControl></FormItem>)} />
                            <FormField name="digitalocean.endpoint" control={form.control} render={({field}) => (<FormItem><FormLabel>Endpoint</FormLabel><FormControl><Input {...field} placeholder="nyc3.digitaloceanspaces.com" /></FormControl></FormItem>)} />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleTest('digitalocean')} disabled={isTesting === 'digitalocean'}>
                            {isTesting === 'digitalocean' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                            Test DigitalOcean Connection
                        </Button>
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="s3" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline bg-muted/20">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">Amazon S3 Configuration</div>
                        <a href="https://console.aws.amazon.com/iam/home#/users" target="_blank" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold">GET KEYS <ExternalLink className="h-2 w-2" /></a>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                     <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="s3.accessKeyId" control={form.control} render={({field}) => (<FormItem><FormLabel>Access Key ID</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField name="s3.secretAccessKey" control={form.control} render={({field}) => (<FormItem><FormLabel>Secret Access Key</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="s3.bucket" control={form.control} render={({field}) => (<FormItem><FormLabel>Bucket Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField name="s3.region" control={form.control} render={({field}) => (<FormItem><FormLabel>Region</FormLabel><FormControl><Input {...field} placeholder="us-east-1" /></FormControl></FormItem>)} />
                        </div>
                         <Button type="button" variant="outline" size="sm" onClick={() => handleTest('s3')} disabled={isTesting === 's3'}>
                            {isTesting === 's3' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                            Test AWS S3 Connection
                        </Button>
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="gcs" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline bg-muted/20">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">Google Cloud Storage Configuration (S3 HMAC)</div>
                        <a href="https://console.cloud.google.com/storage/settings" target="_blank" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold">GET KEYS <ExternalLink className="h-2 w-2" /></a>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="gcs.accessKeyId" control={form.control} render={({field}) => (<FormItem><FormLabel>HMAC Access Key</FormLabel><FormControl><Input {...field} placeholder="GOOG..." /></FormControl></FormItem>)} />
                            <FormField name="gcs.secretAccessKey" control={form.control} render={({field}) => (<FormItem><FormLabel>HMAC Secret Key</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>)} />
                        </div>
                        <FormField name="gcs.bucket" control={form.control} render={({field}) => (
                            <FormItem>
                                <FormLabel>Bucket Name</FormLabel>
                                <FormControl><Input {...field} placeholder="my-gcs-bucket" /></FormControl>
                                <FormDescription>Use the Interoperability tab in GCS Settings to create HMAC keys.</FormDescription>
                            </FormItem>
                        )} />
                        <Button type="button" variant="outline" size="sm" onClick={() => handleTest('gcs')} disabled={isTesting === 'gcs'}>
                            {isTesting === 'gcs' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                            Test GCS Connection
                        </Button>
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="backblaze" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline bg-muted/20">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">Backblaze B2 (S3 API) Configuration</div>
                        <a href="https://secure.backblaze.com/app_keys.htm" target="_blank" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold">GET KEYS <ExternalLink className="h-2 w-2" /></a>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="backblaze.applicationKeyId" control={form.control} render={({field}) => (<FormItem><FormLabel>Key ID</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField name="backblaze.applicationKey" control={form.control} render={({field}) => (<FormItem><FormLabel>Application Key</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="backblaze.bucket" control={form.control} render={({field}) => (<FormItem><FormLabel>Bucket Name</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                            <FormField name="backblaze.endpoint" control={form.control} render={({field}) => (<FormItem><FormLabel>S3 Endpoint</FormLabel><FormControl><Input {...field} placeholder="s3.us-west-001.backblazeb2.com" /></FormControl></FormItem>)} />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleTest('backblaze')} disabled={isTesting === 'backblaze'}>
                            {isTesting === 'backblaze' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                            Test Backblaze Connection
                        </Button>
                    </div>
                </AccordionContent>
            </AccordionItem>

            <AccordionItem value="bunny" className="border rounded-lg overflow-hidden">
                <AccordionTrigger className="px-4 py-4 hover:no-underline bg-muted/20">
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">Bunny.net Storage & CDN Configuration</div>
                        <a href="https://panel.bunny.net/storagefiles" target="_blank" onClick={(e) => e.stopPropagation()} className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 font-bold">GET KEYS <ExternalLink className="h-2 w-2" /></a>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="bunny.storageZoneName" control={form.control} render={({field}) => (<FormItem><FormLabel>Storage Zone Name</FormLabel><FormControl><Input {...field} placeholder="my-storage-zone" /></FormControl></FormItem>)} />
                            <FormField name="bunny.apiKey" control={form.control} render={({field}) => (<FormItem><FormLabel>Storage API Key (Read-Write Password)</FormLabel><FormControl><Input type="password" {...field} /></FormControl></FormItem>)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField name="bunny.region" control={form.control} render={({field}) => (<FormItem><FormLabel>Storage Region (Optional)</FormLabel><FormControl><Input {...field} placeholder="Leave empty for default (DE) or use 'ny', 'sg', 'la', 'uk'" /></FormControl></FormItem>)} />
                            <FormField name="bunny.pullZoneUrl" control={form.control} render={({field}) => (
                                <FormItem>
                                    <FormLabel>Pull Zone URL (CDN)</FormLabel>
                                    <FormControl><Input {...field} placeholder="https://myzone.b-cdn.net" /></FormControl>
                                    <FormDescription>
                                        Do NOT use "https://storage.bunnycdn.com". You must connect a Pull Zone in Bunny.net and use the CDN domain (e.g., https://xxx.b-cdn.net).
                                    </FormDescription>
                                </FormItem>
                            )} />
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => handleTest('bunny')} disabled={isTesting === 'bunny'}>
                            {isTesting === 'bunny' ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Smartphone className="mr-2 h-4 w-4" />}
                            Test Bunny.net Connection
                        </Button>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
      </form>
    </Form>
  );
}
