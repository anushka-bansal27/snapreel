'use client';
import React, { useState, useMemo, useEffect, useTransition } from 'react';
import type { Language, GeneralSettings } from '@/lib/types';
import { languageList } from '@/lib/language-list';
import Link from 'next/link';
import { translateLanguageAction, saveLanguageAction, deleteLanguageAction, saveGeneralSettingsAction } from '@/lib/actions';
import { getAllLanguages, getGeneralSettings } from '@/lib/data.actions';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Edit, Trash2, PlusCircle, Star, Sparkles, Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { countryCodeToEmoji } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';


function LanguageEditDialog({ language, allLanguages, onSaved, children }: { language?: Language | null, allLanguages: Language[] | undefined, onSaved: () => void, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [name, setName] = useState('');
    const [languageCode, setLanguageCode] = useState('');
    const [countryCode, setCountryCode] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [isActive, setIsActive] = useState(true);

    const availableLanguages = useMemo(() => {
      if (!allLanguages) return languageList;
      const existingCodes = new Set(allLanguages.map(l => l.languageCode));
      return languageList.filter(lang => !existingCodes.has(lang.code));
    }, [allLanguages]);

    useEffect(() => {
        if (isOpen) {
            setName(language?.name || '');
            setLanguageCode(language?.languageCode || '');
            setCountryCode(language?.countryCode || '');
            setSelectedLanguage(language ? JSON.stringify({name: language.name, code: language.languageCode, country: language.countryCode}) : '');
            setIsActive(language?.isActive !== false);
        }
    }, [isOpen, language]);

    const handleLanguageSelect = (value: string) => {
        try {
            const lang = JSON.parse(value);
            setSelectedLanguage(value);
            setName(lang.name);
            setLanguageCode(lang.code);
            setCountryCode(lang.country);
        } catch(e) {
            console.error("Failed to parse language data", e);
        }
    };
    
    const handleSaveChanges = async () => {
        if (!name || !languageCode || !countryCode) {
            toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a language.' });
            return;
        }

        setIsSaving(true);
        const languageData = { id: language?.id, name, languageCode, countryCode, isActive };

        const result = await saveLanguageAction(languageData);
        if (result.success) {
            toast({ title: language?.id ? "Language Updated" : "Language Added", description: `"${name}" has been saved.` });
            setIsOpen(false);
            onSaved();
        } else {
            toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
        }
        setIsSaving(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{language ? 'Edit Language' : 'Add New Language'}</DialogTitle>
                    <DialogDescription>
                        {language ? "Update the language details below." : "Select a language to add to your site."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     {language ? (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Language Name</Label>
                                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. English" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="languageCode">Language Code (ISO 639-1)</Label>
                                <Input id="languageCode" value={languageCode} onChange={e => setLanguageCode(e.target.value.toLowerCase())} placeholder="e.g. en" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="countryCode">Country Code (ISO 3166-1)</Label>
                                <Input id="countryCode" value={countryCode} onChange={e => setCountryCode(e.target.value.toUpperCase())} placeholder="e.g. US" />
                            </div>
                        </div>
                     ) : (
                        <div className="space-y-2">
                            <Label>Select Language</Label>
                             <Select value={selectedLanguage} onValueChange={handleLanguageSelect}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose a language..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-60">
                                    {availableLanguages.map((lang) => (
                                        <SelectItem key={lang.code} value={JSON.stringify(lang)}>
                                            <span className="mr-2">{countryCodeToEmoji(lang.country)}</span>
                                            {lang.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                     )}
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label>Active in Android App</Label>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function AITranslationDialog({ languages, children }: { languages: Language[] | undefined, children: React.ReactNode }) {
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [isTranslating, startTransition] = useTransition();

    const handleSelect = (code: string) => {
        setSelected(prev => {
            const newSet = new Set(prev);
            if (newSet.has(code)) {
                newSet.delete(code);
            } else {
                newSet.add(code);
            }
            return newSet;
        });
    };
    
    const handleTranslate = () => {
        const languagesToTranslate = Array.from(selected)
            .map(code => languages?.find(l => l.languageCode === code))
            .filter((l): l is Language => !!l);

        if (languagesToTranslate.length === 0) {
            toast({ variant: 'destructive', title: 'No Languages Selected', description: 'Please select at least one language to translate.' });
            return;
        }

        startTransition(async () => {
            toast({ title: 'Starting AI Translation...', description: `Translating ${languagesToTranslate.length} language(s). This may take a moment.`});
            
            const promises = languagesToTranslate.map(lang => 
                translateLanguageAction(lang.languageCode, lang.name)
            );

            try {
                const results = await Promise.all(promises);
                const failed = results.filter(r => !r.success);
                
                if (failed.length > 0) {
                    const errorMsg = failed.length === 1 ? failed[0].error : `${failed.length} of ${results.length} language(s) failed to translate.`;
                    toast({ variant: 'destructive', title: 'Translation Incomplete', description: errorMsg });
                } else {
                    toast({ title: 'Success!', description: `All ${results.length} selected languages have been translated.` });
                }
                setIsOpen(false);
                setSelected(new Set());
            } catch (e) {
                toast({ variant: 'destructive', title: 'An Error Occurred', description: 'The translation process failed unexpectedly.' });
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>AI Bulk Translation</DialogTitle>
                    <DialogDescription>
                        Select languages to translate using AI. This will overwrite existing translations for the selected languages. English is used as the base language.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-2 py-4 max-h-[50vh] overflow-y-auto">
                    {languages?.filter(l => l.languageCode !== 'en').map(lang => (
                        <div key={lang.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-muted">
                            <Checkbox
                                id={`lang-${lang.id}`}
                                checked={selected.has(lang.languageCode)}
                                onCheckedChange={() => handleSelect(lang.languageCode)}
                            />
                            <Label htmlFor={`lang-${lang.id}`} className="flex items-center gap-2 cursor-pointer">
                                <span className="text-lg">{countryCodeToEmoji(lang.countryCode)}</span>
                                {lang.name}
                                <span className="text-xs text-muted-foreground">({lang.languageCode})</span>
                            </Label>
                        </div>
                    ))}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleTranslate} disabled={isTranslating || selected.size === 0}>
                        {isTranslating ? <Loader2 className="animate-spin" /> : <Sparkles />}
                        Translate ({selected.size})
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DeleteLanguageAlert({ language, onDeleted, children }: { language: Language, onDeleted: () => void, children: React.ReactNode }) {
    const { toast } = useToast();

    const handleDelete = async () => {
        const result = await deleteLanguageAction(language.id);
        if (result.success) {
            toast({ title: 'Language Deleted', description: `Language "${language.name}" has been deleted.` });
            onDeleted();
        } else {
            toast({ variant: 'destructive', title: 'Delete Failed', description: result.error });
        }
    }

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will permanently delete the 
                        language <span className="font-bold">"{language.name}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Continue</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function LanguagesPage() {
  const { toast } = useToast();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [settings, setSettings] = useState<GeneralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
      setLoading(true);
      const [langs, setts] = await Promise.all([getAllLanguages(), getGeneralSettings()]);
      setLanguages(langs);
      setSettings(setts);
      setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleSetDefault = async (language: Language) => {
    const result = await saveGeneralSettingsAction({ defaultLanguageCode: language.languageCode });
    if (result.success) {
        toast({ title: "Default Language Set", description: `"${language.name}" is now the default language.` });
        fetchData();
    } else {
        toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">Manage Languages</h1>
            <p className="text-muted-foreground">Add, edit, or delete languages for your app.</p>
        </div>
        <div className="flex gap-2">
            <AITranslationDialog languages={languages}>
                <Button variant="outline"><Sparkles /> AI Translate</Button>
            </AITranslationDialog>
            <LanguageEditDialog allLanguages={languages} onSaved={fetchData}>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Language</Button>
            </LanguageEditDialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Languages ({languages?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flag</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Language Code</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-6 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                         <Skeleton className="h-8 w-8" />
                         <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && languages?.map((lang) => {
                const isDefault = settings?.defaultLanguageCode === lang.languageCode;
                return (
                    <TableRow key={lang.id}>
                        <TableCell className="text-2xl">{countryCodeToEmoji(lang.countryCode)}</TableCell>
                        <TableCell className="font-medium">{lang.name}</TableCell>
                        <TableCell className="font-mono text-xs">{lang.languageCode}</TableCell>
                        <TableCell>
                            {isDefault ? (
                                <Badge variant="default"><Star className="mr-1 h-3 w-3" /> Default</Badge>
                            ) : (
                                <Button variant="ghost" size="sm" onClick={() => handleSetDefault(lang)}>Set as Default</Button>
                            )}
                        </TableCell>
                        <TableCell>
                            <Switch
                                checked={lang.isActive !== false}
                                onCheckedChange={async value => {
                                    const result = await saveLanguageAction({ ...lang, isActive: value });
                                    if (result.success) {
                                        fetchData();
                                    } else {
                                        toast({ variant: 'destructive', title: 'Update Failed', description: result.error });
                                    }
                                }}
                            />
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="inline-flex gap-1">
                                <Button asChild variant="ghost" size="icon">
                                    <Link href={`/admin/translations/${lang.languageCode}`}>
                                        <Edit className="h-4 w-4" />
                                        <span className="sr-only">Edit Translations</span>
                                    </Link>
                                </Button>
                                
                                <DeleteLanguageAlert language={lang} onDeleted={fetchData}>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" disabled={isDefault}>
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Language</span>
                                    </Button>
                                </DeleteLanguageAlert>
                            </div>
                        </TableCell>
                    </TableRow>
              )})}
            </TableBody>
          </Table>
           {!loading && (!languages || languages.length === 0) && (
             <div className="text-center p-8 text-muted-foreground">
               No languages found. Click "Add Language" to create one.
             </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
