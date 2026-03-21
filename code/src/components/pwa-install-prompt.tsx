'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Smartphone, Download, X } from 'lucide-react';
import { useTranslation } from '@/lib/translation-provider';

export function PwaInstallPrompt({ delay }: { delay: number }) {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const { t } = useTranslation();

    useEffect(() => {
        // Listen for the install prompt from the browser
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Check if dismissed this session
            const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
            if (!dismissed) {
                setTimeout(() => {
                    setIsVisible(true);
                }, delay * 1000);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, [delay]);

    const handleDismiss = () => {
        setIsVisible(false);
        sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    };

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        setDeferredPrompt(null);
        setIsVisible(false);
    };

    if (!isVisible || !deferredPrompt) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 duration-500">
            <Card className="bg-background/95 backdrop-blur-md border-primary/20 shadow-2xl overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4 relative">
                    <button 
                        onClick={handleDismiss}
                        className="absolute top-1 right-1 p-1 text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    
                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-black truncate">Install App</p>
                        <p className="text-[10px] text-muted-foreground leading-tight">Add to home screen for faster access.</p>
                    </div>

                    <Button size="sm" onClick={handleInstall} className="h-8 px-4 rounded-full font-bold shadow-lg shadow-primary/20">
                        <Download className="h-3 w-3 mr-2" />
                        Install
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}