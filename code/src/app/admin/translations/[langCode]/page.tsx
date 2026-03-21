'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { translationKeys } from '@/lib/translation-keys';
import { getTranslations, getCustomPages, getDemoModeStatus } from '@/lib/data.actions';
import { saveLanguageTranslationsAction, translateLanguageAction } from '@/lib/actions';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, ArrowLeft, Globe, Search, BookText, Sparkles, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { CustomPage } from '@/lib/types';

function EditTranslationsSkeleton() {
    return (
        <Card>
            <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-6">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

export default function EditTranslationPage() {
    const params = useParams();
    const { langCode } = params as { langCode: string };
    const { toast } = useToast();
    
    const [isSaving, setIsSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [pages, setPages] = useState<CustomPage[]>([]);

    useEffect(() => {
        if (!langCode) return;
        
        setLoading(true);
        Promise.all([
            getTranslations(langCode),
            getCustomPages(),
            getDemoModeStatus()
        ]).then(([dbTranslations, pagesData, isDemo]) => {
            const newTranslations: Record<string, string> = {};
            translationKeys.forEach(({ key, default: defaultValue }) => {
                if (dbTranslations && dbTranslations[key] !== undefined) {
                    newTranslations[key] = dbTranslations[key];
                } else {
                    newTranslations[key] = '';
                }
            });
            
            // Filter out installation-setup in demo mode
            const visiblePages = isDemo 
              ? pagesData.filter(p => p.slug !== 'installation-setup')
              : pagesData;

            // Add existing page content to translations state for preview/edit
            visiblePages.forEach(page => {
                const titleKey = `page_title_${page.slug}`;
                const contentKey = `page_content_${page.slug}`;
                newTranslations[titleKey] = dbTranslations?.[titleKey] || '';
                newTranslations[contentKey] = dbTranslations?.[contentKey] || '';
            });

            setTranslations(newTranslations);
            setPages(visiblePages);
            setLoading(false);
        });
    }, [langCode]);
    
    const handleInputChange = (key: string, value: string) => {
        setTranslations(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSaveChanges = async () => {
        if (!langCode) return;
        setIsSaving(true);
        const result = await saveLanguageTranslationsAction(langCode, translations);
        if (result.success) {
            toast({ title: "Translations Saved", description: `Dictionary for "${langCode.toUpperCase()}" updated.` });
        } else {
            toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
        }
        setIsSaving(false);
    };

    if (loading) return <EditTranslationsSkeleton />;

    const uiKeys = translationKeys.filter(k => k.category === 'ui' || !k.category);
    const seoKeys = translationKeys.filter(k => k.category === 'seo');
    
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter uppercase">Localization: {langCode.toUpperCase()}</h1>
                    <p className="text-muted-foreground text-xs font-medium tracking-wide">Manage site-wide strings and SEO in one place.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" asChild><Link href="/admin/languages"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Link></Button>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="ui" className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-14 bg-card/50 border border-white/5 p-1 rounded-2xl">
                    <TabsTrigger value="ui" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                        <Globe className="h-4 w-4" /> SITE UI
                    </TabsTrigger>
                    <TabsTrigger value="seo" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                        <Search className="h-4 w-4" /> SEO & META
                    </TabsTrigger>
                    <TabsTrigger value="pages" className="rounded-xl font-black uppercase text-[10px] tracking-widest gap-2">
                        <BookText className="h-4 w-4" /> CUSTOM PAGES
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="ui" className="mt-6">
                    <Card className="bg-card/20 border-white/5">
                        <CardHeader><CardTitle>UI Strings</CardTitle><CardDescription>Standard labels, buttons, and system messages.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            {uiKeys.map((item) => (
                                <div key={item.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border-b border-white/5 pb-4 last:border-0">
                                    <div className="space-y-1">
                                        <Label className="font-mono text-[9px] text-primary">{item.key}</Label>
                                        <p className="text-xs text-muted-foreground italic">English: "{item.default}"</p>
                                    </div>
                                    <Input value={translations[item.key] || ''} onChange={(e) => handleInputChange(item.key, e.target.value)} placeholder={item.default} className="bg-black/20" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="seo" className="mt-6">
                    <Card className="bg-card/20 border-white/5">
                        <CardHeader><CardTitle>Search Optimization</CardTitle><CardDescription>Define how search engines see your site in this language.</CardDescription></CardHeader>
                        <CardContent className="space-y-6">
                            {seoKeys.map((item) => (
                                <div key={item.key} className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border-b border-white/5 pb-4 last:border-0">
                                    <div className="space-y-1">
                                        <Label className="font-mono text-[9px] text-amber-500">{item.key}</Label>
                                        <p className="text-xs text-muted-foreground italic">English: "{item.default}"</p>
                                    </div>
                                    <Input value={translations[item.key] || ''} onChange={(e) => handleInputChange(item.key, e.target.value)} placeholder={item.default} className="bg-black/20 border-amber-500/20" />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pages" className="mt-6">
                    <Card className="bg-card/20 border-white/5">
                        <CardHeader><CardTitle>Custom Page Content</CardTitle><CardDescription>Translate titles and content for all static pages.</CardDescription></CardHeader>
                        <CardContent className="space-y-10">
                            {pages.map((page) => (
                                <div key={page.id} className="space-y-4 p-6 bg-white/[0.02] rounded-2xl border border-white/5">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="font-mono uppercase text-[9px]">/{page.slug}</Badge>
                                        <a href={`/p/${page.slug}`} target="_blank" className="text-[10px] text-primary hover:underline flex items-center gap-1">VIEW PAGE <ExternalLink className="h-3 w-3" /></a>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Translated Title</Label>
                                            <Input 
                                                value={translations[`page_title_${page.slug}`] || ''} 
                                                onChange={(e) => handleInputChange(`page_title_${page.slug}`, e.target.value)} 
                                                placeholder={page.title}
                                                className="bg-black/20"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Original Reference</Label>
                                            <div className="h-10 px-3 flex items-center bg-black/40 rounded-md text-xs text-white/40 italic truncate">{page.title}</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Translated Content (HTML Supported)</Label>
                                        <textarea 
                                            value={translations[`page_content_${page.slug}`] || ''} 
                                            onChange={(e) => handleInputChange(`page_content_${page.slug}`, e.target.value)}
                                            placeholder="Translate the page content here..."
                                            className="w-full min-h-[150px] bg-black/20 border border-input rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary"
                                        />
                                    </div>
                                </div>
                            ))}
                            {pages.length === 0 && <p className="text-center py-10 text-muted-foreground italic">No pages found.</p>}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
