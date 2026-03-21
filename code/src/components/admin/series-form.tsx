'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Series, Language } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useRef, useEffect, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Save, Sparkles, Loader2, CheckCircle, Upload, Star, Zap, Eye, Wand2, BrainCircuit } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateFullSeriesMetadataAction, saveSeriesAction } from '@/lib/actions';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { getAllLanguages, getGeneralSettings } from '@/lib/data.actions';
import { Skeleton } from '@/components/ui/skeleton';

const formSchema = z.object({
  title: z.string().min(2, 'Title must be at least 2 characters.'),
  slug: z.string().min(2, 'Slug is required.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  genres: z.string().min(1, 'Please add at least one genre.'),
  tags: z.string().optional(),
  coverUrl: z.string().min(1, 'Please upload a cover image.'),
  featuredCoverUrl: z.string().optional(),
  targetLanguages: z.array(z.string()).min(1, 'Please select at least one language for visibility.'),
  freeEpisodesCount: z.coerce.number().min(0).default(0),
  isFeatured: z.boolean().default(false),
  isPremium: z.boolean().default(false),
  views: z.coerce.number().min(0).default(0),
  likes: z.coerce.number().min(0).default(0),
  seoTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  metaKeywords: z.string().optional(),
});

type SeriesFormValues = z.infer<typeof formSchema>;

type SeriesFormProps = {
  series?: Series;
};

const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

const AI_LOADING_MESSAGES = [
    "AI is analyzing your story plot...",
    "Crafting a compelling synopsis...",
    "Generating SEO-optimized metadata...",
    "Creating relevant tags & categories...",
    "Optimizing discoverability...",
    "Finalizing l-moufid..."
];

export function SeriesForm({ series }: SeriesFormProps) {
  const [isGenerating, startGenTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingFeatured, setIsUploadingFeatured] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const featuredFileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(series?.coverUrl ?? null);
  const [featuredPreview, setFeaturedPreview] = useState<string | null>(series?.featuredCoverUrl ?? null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [langsLoading, setLangsLoading] = useState(true);
  const [webpEnabled, setWebpEnabled] = useState(true);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoadingMsgIndex, setAiLoadingMsgIndex] = useState(0);

  useEffect(() => {
    getAllLanguages().then(data => {
        setLanguages(data);
        setLangsLoading(false);
    });
    getGeneralSettings().then(settings => {
        setWebpEnabled(settings?.webpConversionEnabled !== false);
    });
  }, []);

  // Interval for AI loading messages
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isGenerating) {
        interval = setInterval(() => {
            setAiLoadingMsgIndex(prev => (prev + 1) % AI_LOADING_MESSAGES.length);
        }, 2000);
    } else {
        setAiLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const form = useForm<SeriesFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: series?.title ?? '',
      slug: series?.slug ?? '',
      description: series?.description ?? '',
      genres: series?.genres?.join(', ') ?? '',
      tags: series?.tags?.join(', ') ?? '',
      coverUrl: series?.coverUrl ?? '',
      featuredCoverUrl: series?.featuredCoverUrl ?? '',
      targetLanguages: series?.targetLanguages ?? [],
      freeEpisodesCount: series?.freeEpisodesCount ?? 5,
      isFeatured: series?.isFeatured ?? false,
      isPremium: series?.isPremium ?? false,
      views: series?.views ?? 0,
      likes: (series as any)?.likes ?? 0,
      seoTitle: series?.seoTitle ?? '',
      metaDescription: series?.metaDescription ?? '',
      metaKeywords: series?.metaKeywords?.join(', ') ?? '',
    },
  });

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    form.setValue('title', e.target.value);
    if (!series?.id || !form.getValues('slug')) {
        form.setValue('slug', slugify(e.target.value));
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const processImage = async (originalFile: File): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const format = webpEnabled ? 'image/webp' : 'image/jpeg';
                canvas.toBlob((blob) => resolve(blob), format, 0.85);
            };
            img.src = URL.createObjectURL(originalFile);
        });
    };

    const processedBlob = await processImage(file);
    if (!processedBlob) {
        setIsUploading(false);
        return;
    }

    const formData = new FormData();
    const finalFileName = webpEnabled ? file.name.replace(/\.[^/.]+$/, "") + ".webp" : file.name;
    formData.append('file', processedBlob, finalFileName);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.url) {
            setCoverPreview(data.url);
            form.setValue('coverUrl', data.url, { shouldValidate: true });
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Upload Error', description: err.message });
    } finally {
        setIsUploading(false);
    }
  };

  const handleFeaturedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFeatured(true);

    const processImage = async (originalFile: File): Promise<Blob | null> => {
        return new Promise((resolve) => {
            const img = document.createElement('img');
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1920;
                let scaleSize = 1;
                if (img.width > MAX_WIDTH) {
                    scaleSize = MAX_WIDTH / img.width;
                }
                canvas.width = img.width * scaleSize;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
                const format = webpEnabled ? 'image/webp' : 'image/jpeg';
                canvas.toBlob((blob) => resolve(blob), format, 0.85);
            };
            img.src = URL.createObjectURL(originalFile);
        });
    };

    const processedBlob = await processImage(file);
    if (!processedBlob) {
        setIsUploadingFeatured(false);
        return;
    }

    const formData = new FormData();
    const finalFileName = webpEnabled ? file.name.replace(/\.[^/.]+$/, "") + "_featured.webp" : file.name;
    formData.append('file', processedBlob, finalFileName);

    try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData });
        const data = await res.json();
        if (data.success && data.url) {
            setFeaturedPreview(data.url);
            form.setValue('featuredCoverUrl', data.url, { shouldValidate: true });
        } else {
            throw new Error(data.error || 'Upload failed');
        }
    } catch (err: any) {
        toast({ variant: 'destructive', title: 'Upload Error', description: err.message });
    } finally {
        setIsUploadingFeatured(false);
    }
  };
  
  const handleFullAIGenerate = () => {
    if (!aiPrompt) {
        toast({ variant: 'destructive', title: 'AI Prompt Required', description: 'Please describe the drama or story first for the AI.' });
        return;
    }
    
    startGenTransition(async () => {
        const result = await generateFullSeriesMetadataAction(aiPrompt);
        if (result.success && result.data) {
            const d = result.data;
            form.setValue('title', d.title, { shouldValidate: true });
            form.setValue('slug', d.slug, { shouldValidate: true });
            form.setValue('description', d.description, { shouldValidate: true });
            form.setValue('genres', d.genres.join(', '), { shouldValidate: true });
            form.setValue('tags', d.tags.join(', '), { shouldValidate: true });
            form.setValue('seoTitle', d.seoTitle, { shouldValidate: true });
            form.setValue('metaDescription', d.metaDescription, { shouldValidate: true });
            form.setValue('metaKeywords', d.metaKeywords.join(', '), { shouldValidate: true });
            toast({ title: 'AI Generation Successful', description: 'Form fields have been populated.' });
        } else {
             toast({ variant: 'destructive', title: 'Generation Failed', description: result.error });
        }
    });
  }

  const onSubmit = async (values: SeriesFormValues) => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
        const genres = values.genres.split(',').map(g => g.trim()).filter(g => g.length > 0);
        const tags = values.tags?.split(',').map(t => t.trim()).filter(t => t.length > 0) || [];
        const metaKeywords = values.metaKeywords?.split(',').map(k => k.trim()).filter(k => k.length > 0) || [];
        
        const seriesData = {
            id: series?.id,
            ...values,
            genres,
            tags,
            metaKeywords,
        };

        const result = await saveSeriesAction(seriesData);

        if (result.success) {
            toast({ title: 'Success', description: `Series "${values.title}" saved.` });
            setSaveSuccess(true);
            setTimeout(() => {
                router.push('/admin/series');
                router.refresh();
            }, 1000);
        } else {
            toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
        }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Error' });
    } finally {
        setIsSaving(false);
    }
  };

  const triggerSubmit = () => {
    if (formRef.current) {
        formRef.current.requestSubmit();
    }
  };

  return (
    <Card className="max-w-5xl mx-auto shadow-2xl bg-card/30 border-white/5 backdrop-blur-sm">
      <CardHeader className="border-b border-white/5 pb-8 mb-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <CardTitle className="text-3xl font-black italic tracking-tighter uppercase">{series ? 'Edit Series' : 'Add New Drama'}</CardTitle>
                <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground mt-1">Configure your drama universe content</CardDescription>
            </div>
            <Button 
                type="button"
                onClick={triggerSubmit}
                disabled={isSaving || isUploading || isGenerating} 
                className={cn("h-12 px-8 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all duration-300", saveSuccess ? 'bg-green-600' : 'bg-primary hover:bg-primary/90')}
            >
                {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : saveSuccess ? <CheckCircle className="mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                {saveSuccess ? 'Done!' : 'Quick Save'}
            </Button>
        </div>

        {!series && (
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-[2rem] space-y-4 animate-in fade-in duration-700 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-3xl -mr-16 -mt-16 group-hover:bg-primary/20 transition-all duration-700" />
                
                <div className="flex items-center gap-2 relative z-10">
                    <BrainCircuit className={cn("h-5 w-5 text-primary", isGenerating && "animate-pulse")} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">AI Metadata Generator</span>
                </div>
                
                <div className="space-y-3 relative z-10">
                    <Label className="text-[10px] font-bold text-muted-foreground uppercase">Describe the story or drama details:</Label>
                    <Textarea 
                        placeholder="e.g. A poor girl finds out she is the heiress of a billionaire family and starts a revenge mission against her stepmother..." 
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        disabled={isGenerating}
                        className="bg-black/20 border-white/5 min-h-[100px] text-sm focus:border-primary/50 transition-colors"
                    />
                    
                    <Button 
                        type="button" 
                        onClick={handleFullAIGenerate} 
                        disabled={isGenerating || !aiPrompt} 
                        className={cn(
                            "w-full h-14 rounded-2xl font-black uppercase tracking-tighter shadow-lg transition-all active:scale-95",
                            isGenerating 
                                ? "bg-zinc-800 text-white/50 border border-white/5 cursor-not-allowed" 
                                : "bg-amber-500 hover:bg-amber-600 text-black shadow-amber-500/20"
                        )}
                    >
                        {isGenerating ? (
                            <div className="flex items-center gap-3">
                                <Loader2 className="animate-spin h-5 w-5" />
                                <span className="animate-pulse">{AI_LOADING_MESSAGES[aiLoadingMsgIndex]}</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5" />
                                <span>AI-Powered Content Generator</span>
                            </div>
                        )}
                    </Button>
                    <p className="text-[9px] text-muted-foreground italic text-center opacity-60">AI will automatically analyze your plot and fill Title, Description, SEO, Tags and Categories.</p>
                </div>
            </div>
        )}
      </CardHeader>

      <CardContent>
        <Form {...form}>
          <form 
            ref={formRef} 
            onSubmit={form.handleSubmit(onSubmit, (errors) => {
                const firstError = Object.values(errors)[0];
                if (firstError) {
                    toast({
                        variant: 'destructive',
                        title: 'Validation Error',
                        description: firstError.message as string || 'Please check the required fields.'
                    });
                }
            })} 
            className="space-y-12"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Drama Name / Title</FormLabel>
                                <FormControl>
                                    <Input placeholder="Series Title" {...field} onChange={handleTitleChange} className="h-14 text-lg bg-black/20 font-bold border-white/10" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">URL Slug (SEO)</FormLabel>
                                <FormControl>
                                    <Input placeholder="auto-generated-slug" {...field} className="bg-black/10 font-mono text-xs text-muted-foreground border-white/5" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <div className="lg:col-span-5">
                    <Card className="bg-primary/5 border-primary/20 h-full">
                        <CardHeader className="py-4">
                            <CardTitle className="text-xs font-black uppercase tracking-tighter flex items-center gap-2">
                                <Globe className="h-4 w-4 text-primary" /> Target Visibility
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-y-3 gap-x-4">
                            {langsLoading ? Array.from({length: 4}).map((_, i) => <Skeleton key={i} className="h-6 w-full bg-white/5" />) : languages?.map((lang) => (
                                <FormField
                                    key={lang.id}
                                    control={form.control}
                                    name="targetLanguages"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                            <FormControl>
                                                <Checkbox
                                                    checked={field.value?.includes(lang.languageCode)}
                                                    onCheckedChange={(checked) => {
                                                        return checked
                                                            ? field.onChange([...field.value, lang.languageCode])
                                                            : field.onChange(field.value?.filter((value: string) => value !== lang.languageCode))
                                                    }}
                                                />
                                            </FormControl>
                                            <FormLabel className="text-[10px] font-black uppercase cursor-pointer text-white/70">
                                                {lang.name}
                                            </FormLabel>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Synopsis / Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Full summary of the story..."
                      className="min-h-[180px] bg-black/20 border-white/10 text-sm leading-relaxed"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                <FormField
                    control={form.control}
                    name="genres"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Genres / Categories</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Romance, Revenge" {...field} className="bg-black/20" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Plot Tags</FormLabel>
                            <FormControl>
                                <Input placeholder="e.g. Hidden CEO, Contract Marriage" {...field} className="bg-black/20" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </div>

            <Card className="bg-white/[0.02] border-white/5 overflow-hidden">
                <CardHeader className="bg-white/[0.03] border-b border-white/5">
                    <CardTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">Search Engine Optimization (SEO)</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="seoTitle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] font-bold text-muted-foreground">Meta Title</FormLabel>
                                    <FormControl><Input {...field} className="bg-black/20 border-white/10" /></FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="metaKeywords"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[9px] font-bold text-muted-foreground">Meta Keywords</FormLabel>
                                    <FormControl><Input {...field} className="bg-black/20 border-white/10" /></FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="metaDescription"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[9px] font-bold text-muted-foreground">Meta Description</FormLabel>
                                <FormControl><Textarea {...field} className="bg-black/20 border-white/10 h-20" /></FormControl>
                            </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-4 border-t border-white/5">
                <FormField
                    control={form.control}
                    name="freeEpisodesCount"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Free Episodes Count</FormLabel>
                            <FormControl><Input type="number" {...field} className="bg-black/20" /></FormControl>
                            <FormDescription className="text-[9px]">Episodes unlocked by default.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="views"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Eye className="h-3 w-3" /> Initial Views</FormLabel>
                            <FormControl><Input type="number" {...field} className="bg-black/20" /></FormControl>
                            <FormDescription className="text-[9px]">Starting display view count.</FormDescription>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="likes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Star className="h-3 w-3" /> Initial Likes</FormLabel>
                            <FormControl><Input type="number" {...field} className="bg-black/20" /></FormControl>
                            <FormDescription className="text-[9px]">Starting display like count.</FormDescription>
                        </FormItem>
                    )}
                />

                <div className="flex flex-col justify-center gap-4">
                    <FormField
                        control={form.control}
                        name="isFeatured"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/10 px-4 py-3 bg-black/20">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-amber-400">Featured</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="isPremium"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-xl border border-white/10 px-4 py-3 bg-black/20">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-primary">Premium</FormLabel>
                                </div>
                                <FormControl>
                                    <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                <FormField
                  control={form.control}
                  name="coverUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Poster / Cover Image</FormLabel>
                      <FormControl>
                          <div className="flex flex-col sm:flex-row gap-8 items-start">
                              <div className="space-y-4">
                                  <input type="file" accept="image/*" ref={coverFileInputRef} onChange={handleImageChange} className="hidden" />
                                  <Button type="button" variant="outline" disabled={isUploading} onClick={() => coverFileInputRef.current?.click()} className="h-20 w-full sm:w-48 border-dashed rounded-2xl">
                                      {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="mr-2" />}
                                      Upload Poster
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground italic">Required. Recommended: 600x900px</p>
                              </div>
                              {coverPreview && (
                                <div className="relative w-28 sm:w-32 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group shrink-0">
                                    <Image src={coverPreview} alt="Preview" fill className="object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-[10px] font-black text-white uppercase">Preview</p>
                                    </div>
                                </div>
                              )}
                          </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="featuredCoverUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Featured Image (Optional)</FormLabel>
                      <FormControl>
                          <div className="flex flex-col sm:flex-row gap-8 items-start">
                              <div className="space-y-4">
                                  <input type="file" accept="image/*" ref={featuredFileInputRef} onChange={handleFeaturedImageChange} className="hidden" />
                                  <Button type="button" variant="outline" disabled={isUploadingFeatured} onClick={() => featuredFileInputRef.current?.click()} className="h-20 w-full sm:w-48 border-dashed rounded-2xl border-amber-500/30 hover:border-amber-500/50 hover:bg-amber-500/10 text-amber-500">
                                      {isUploadingFeatured ? <Loader2 className="animate-spin" /> : <Upload className="mr-2" />}
                                      Upload Featured
                                  </Button>
                                  <p className="text-[9px] text-muted-foreground italic">Optional. Used for sliders (16:9). Falls back to Poster if empty.</p>
                              </div>
                              {featuredPreview && (
                                <div className="relative w-40 sm:w-48 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/10 group shrink-0 bg-black/20">
                                    <Image src={featuredPreview} alt="Featured Preview" fill className="object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-[10px] font-black text-white uppercase">Preview</p>
                                    </div>
                                </div>
                              )}
                          </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>

            <Button type="submit" disabled={isSaving || isUploading || isGenerating} className={cn("w-full h-20 text-xl font-black italic tracking-tighter uppercase rounded-[2rem] shadow-2xl transition-all duration-500", saveSuccess ? 'bg-green-600' : 'bg-primary hover:bg-primary/90 hover:scale-[1.01] active:scale-95')}>
              {isSaving ? <Loader2 className="animate-spin mr-2 h-6 w-6" /> : saveSuccess ? <CheckCircle className="mr-2 h-6 w-6" /> : <Save className="mr-2 h-6 w-6" />}
              {saveSuccess ? 'Mission Successful!' : 'Save Drama Series'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function Globe(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" ><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"/></svg>
  )
}
