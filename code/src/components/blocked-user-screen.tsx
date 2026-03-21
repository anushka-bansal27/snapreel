'use client';

import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import Link from 'next/link';
import { Button } from './ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Mail } from 'lucide-react';
import { useTranslation } from '@/lib/translation-provider';
import { i18n } from '@/i18n-config';

export function BlockedUserScreen() {
    const auth = useAuth();
    const { toast } = useToast();
    const { languageCode, t } = useTranslation();

    const langPrefix = languageCode === i18n.defaultLocale ? '' : `/${languageCode}`;
    const contactUrl = `${langPrefix}/contact`;

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast({ title: t('user_button_toast_signout_success_title') });
        } catch (error: any) {
            toast({ variant: 'destructive', title: t('user_button_toast_signout_fail_title'), description: error.message });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
            <div className="text-center p-8 max-w-md w-full rounded-lg border bg-card shadow-2xl">
                <h1 className="text-3xl font-bold text-destructive">You Are Blocked</h1>
                <p className="text-muted-foreground mt-4 mb-8">
                    Your account has been suspended. If you believe this is an error, please contact support.
                </p>
                <div className="flex justify-center gap-4">
                    <Button asChild variant="outline">
                        <Link href={contactUrl}>
                            <Mail className="mr-2 h-4 w-4" />
                            {t('footer_contact_us')}
                        </Link>
                    </Button>
                    <Button onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        {t('user_button_logout')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
