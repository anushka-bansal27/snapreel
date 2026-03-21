
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Camera, KeyRound, Gift, ArrowRight, Coins, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import type { RewardsSettings } from '@/lib/types';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useTranslation } from '@/lib/translation-provider';

const passwordSchema = z.object({
    oldPassword: z.string().optional(),
    newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ['confirmPassword'],
});

function ChangePasswordForm() {
    const { user } = useUser();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isSaving, setIsSaving] = useState(false);

    const hasPasswordProvider = user?.providerData.some(p => p.providerId === 'password');

    const form = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { oldPassword: '', newPassword: '', confirmPassword: '' },
    });

    const onSubmit = async (values: z.infer<typeof passwordSchema>) => {
        if (!user) {
            toast({ variant: 'destructive', title: t('common_error'), description: t('my_list_login_desc') });
            return;
        }

        setIsSaving(true);
        
        try {
            if (hasPasswordProvider) {
                if (!values.oldPassword) {
                    form.setError('oldPassword', { type: 'manual', message: 'Old password is required.' });
                    setIsSaving(false);
                    return;
                }
                const credential = EmailAuthProvider.credential(user.email!, values.oldPassword);
                await reauthenticateWithCredential(user, credential);
            }
            
            await updatePassword(user, values.newPassword);
            toast({ title: t('common_success'), description: 'Your password has been updated.' });
            form.reset();
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('profile_update_password_button'), description: error.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('profile_change_password_title')}</CardTitle>
                <CardDescription>{t('profile_change_password_desc')}</CardDescription>
            </CardHeader>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardContent className="space-y-4">
                        {hasPasswordProvider && (
                            <FormField
                                control={form.control}
                                name="oldPassword"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{t('profile_old_password_label')}</FormLabel>
                                        <FormControl>
                                            <Input type="password" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}
                        <FormField
                            control={form.control}
                            name="newPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile_new_password_label')}</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="confirmPassword"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{t('profile_confirm_password_label')}</FormLabel>
                                    <FormControl>
                                        <Input type="password" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin" /> : <><KeyRound className="mr-2 h-4 w-4" />{t('profile_update_password_button')}</>}
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

export default function ProfilePage() {
  const firestore = useFirestore();
  const { user, userProfile, loading, refreshProfile } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;

  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { data: rewardSettings } = useDoc<RewardsSettings>(
    useMemoFirebase(() => firestore ? doc(firestore, 'settings', 'rewards') : null, [firestore])
  );

  useEffect(() => {
    if (userProfile) {
      setDisplayName(userProfile.displayName || '');
      setPhotoURL(userProfile.photoURL || '');
    }
  }, [userProfile]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = document.createElement('img');
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 256;
            let width = img.width;
            let height = img.height;

            if (width > MAX_WIDTH) {
                height = (height * MAX_WIDTH) / width;
                width = MAX_WIDTH;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    setIsUploading(false);
                    return;
                }
                const formData = new FormData();
                formData.append('file', blob, file.name);

                try {
                    const res = await fetch('/api/upload', { method: 'POST', body: formData });
                    if (!res.ok) {
                        let errorMessage = `Upload failed: ${res.status} ${res.statusText}`;
                        if (res.status === 413) {
                            errorMessage = 'Upload failed: The image file is too large. Please check your server (e.g., Nginx) configuration.';
                        } else {
                            try {
                                const errorData = await res.json();
                                if (errorData.error) errorMessage = errorData.error;
                            } catch (jsonError) { /* Not a JSON response */ }
                        }
                        throw new Error(errorMessage);
                    }

                    const data = await res.json();
                    if (data.success && data.url) {
                        setPhotoURL(data.url);
                        toast({ 
                            title: t('profile_upload_photo_toast_success'), 
                            description: t('profile_upload_photo_toast_success_desc') 
                        });
                    } else {
                        throw new Error(data.error || 'Upload failed');
                    }
                } catch (err: any) {
                    toast({ variant: 'destructive', title: t('common_error'), description: err.message });
                } finally {
                    setIsUploading(false);
                }
            }, file.type, 0.8);
        };
        img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };
  
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    return name[0].toUpperCase();
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
        toast({ variant: 'destructive', title: t('common_error'), description: t('my_list_login_desc') });
        return;
    }
    
    setIsSaving(true);
    const updatedData = { displayName, photoURL };
    
    try {
        const idToken = await user.getIdToken();
        const response = await fetch(`/api/user/${user.uid}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify(updatedData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to update profile.');
        }

        await refreshProfile();
        toast({ title: t('common_success'), description: t('profile_toast_success') });
    } catch (error: any) {
        toast({ variant: 'destructive', title: t('common_error'), description: error.message });
    } finally {
        setIsSaving(false);
    }
  };

  if (loading) {
    return (
        <div className="container mx-auto px-4 py-32 md:py-40 max-w-2xl space-y-6">
            <Card>
                <CardHeader>
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="flex items-center space-x-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <div className="space-y-2">
                           <Skeleton className="h-6 w-40" />
                           <Skeleton className="h-4 w-56" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user || !userProfile) {
    return <div className="container mx-auto px-4 py-32 md:py-40 text-center">{t('my_list_login_title')}</div>;
  }

  const isRewardsEnabled = rewardSettings?.isEnabled !== false;

  return (
    <div className="container mx-auto px-4 py-32 md:py-40 max-w-2xl space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">{t('profile_title')}</CardTitle>
          <CardDescription>{t('profile_desc')}</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdate}>
            <CardContent className="space-y-8">
            <div className="flex items-center space-x-6">
                <div className="relative group">
                    <Avatar className="h-24 w-24 border-2 border-primary">
                        <AvatarImage src={photoURL || undefined} alt={userProfile.displayName || 'User'} />
                        <AvatarFallback className="text-3xl">{getInitials(userProfile.displayName)}</AvatarFallback>
                    </Avatar>
                    <Label htmlFor="photo-upload" className="absolute inset-0 bg-black/40 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-full">
                        {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Camera className="h-8 w-8" />}
                    </Label>
                     <Input 
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        disabled={isUploading}
                        onChange={handlePhotoChange}
                        className="hidden"
                     />
                </div>
                <div>
                <h2 className="text-2xl font-bold">{userProfile.displayName}</h2>
                <p className="text-muted-foreground">{userProfile.email}</p>
                </div>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                <Label htmlFor="displayName">{t('profile_display_name_label')}</Label>
                <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder={t('profile_display_name_placeholder')}
                />
                </div>
            </div>
            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={isSaving || isUploading}>
                    {isSaving ? <Loader2 className="animate-spin" /> : t('profile_save_button')}
                </Button>
            </CardFooter>
        </form>
      </Card>

      {isRewardsEnabled && (
        <Card className="border-amber-500/5 bg-amber-500/5 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="text-amber-500 flex items-center gap-2">
                        <Gift className="h-5 w-5" /> {t('profile_rewards_card_title')}
                    </CardTitle>
                    <CardDescription>{t('profile_rewards_card_desc')}</CardDescription>
                </div>
                <div className="text-right">
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">{t('profile_rewards_balance_label')}</p>
                    <div className="flex items-center gap-1 text-amber-500 font-black">
                        <Coins className="h-4 w-4" /> {(userProfile.coins || 0).toLocaleString()}
                    </div>
                </div>
            </CardHeader>
            <CardFooter>
                <Button asChild className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                    <Link href={`${langPrefix}/rewards`}>
                        {t('profile_rewards_go_to_center')} <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </CardFooter>
        </Card>
      )}

      <ChangePasswordForm />
    </div>
  );
}

    
