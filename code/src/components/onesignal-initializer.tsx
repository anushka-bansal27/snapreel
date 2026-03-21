'use client';
import { useEffect } from 'react';
import Script from 'next/script';
import { getPluginsSettings } from '@/lib/data.actions';

export function OneSignalInitializer() {
    useEffect(() => {
        getPluginsSettings().then(settings => {
            if (settings?.oneSignalAppId) {
                const appId = settings.oneSignalAppId;
                const delay = (settings.oneSignalPromptDelay || 5) * 1000;

                // Standard OneSignal Web SDK Initialization
                // @ts-ignore
                window.OneSignal = window.OneSignal || [];
                
                // @ts-ignore
                window.OneSignal.push(function() {
                    // @ts-ignore
                    window.OneSignal.init({
                        appId: appId,
                        allowLocalhostAsSecureOrigin: true,
                        notifyButton: {
                            enable: false,
                        },
                    });

                    // To show prompt after delay on every refresh during testing, 
                    // users usually need to clear their browser cache/site data.
                    setTimeout(() => {
                        // @ts-ignore
                        if (window.OneSignal.showSlidedownPrompt) {
                            // @ts-ignore
                            window.OneSignal.showSlidedownPrompt();
                        }
                    }, delay);
                });
            }
        });
    }, []);

    return (
        <Script 
            src="https://cdn.onesignal.com/sdks/OneSignalSDK.js" 
            strategy="afterInteractive" 
        />
    );
}
