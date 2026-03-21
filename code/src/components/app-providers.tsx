'use client';

import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { ConditionalHeaderWrapper } from '@/components/conditional-header-wrapper';
import { FirebaseClientProvider, useUser } from '@/firebase';
import { Footer } from '@/components/footer';
import { TranslationProvider, useTranslation } from '@/lib/translation-provider';
import { SettingsProvider } from '@/lib/settings-provider';
import { FavoritesProvider } from '@/lib/favorites-provider';
import { WatchHistoryProvider } from '@/lib/history-provider';
import { BlockedUserScreen } from '@/components/blocked-user-screen';
import React, { useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { i18n } from '@/i18n-config';
import type { GeneralSettings } from '@/lib/types';

function AppContent({ children }: { children: React.ReactNode }) {
  const { userProfile, loading } = useUser();
  const { isRTL } = useTranslation();
  const pathname = usePathname();

  const isPathAllowedForBlockedUser = useMemo(() => {
    if (!pathname) return false;

    // Extract the core path without the locale prefix
    const segments = pathname.split('/').filter(Boolean);
    const potentialLocale = segments[0];
    const corePath = i18n.locales.includes(potentialLocale as any)
      ? `/${segments.slice(1).join('/')}`
      : pathname;
    
    // Define allowed paths for blocked users
    const allowedPaths = ['/contact'];
    
    // Check if it's an allowed static path or a dynamic page under /p/
    return allowedPaths.includes(corePath) || corePath.startsWith('/p/');
  }, [pathname]);

  if (userProfile?.disabled && !isPathAllowedForBlockedUser) {
    return <BlockedUserScreen />;
  }
  
  // Don't render children until we know the user is not disabled.
  if (loading && !userProfile) {
    return null; 
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'}>
        {children}
    </div>
  );
}


export function AppProviders({
  children,
  lang,
  settings,
}: {
  children: React.ReactNode;
  lang: string;
  settings: GeneralSettings | null;
}) {
  useEffect(() => {
    if (settings?.defaultLanguageCode) {
      document.cookie = `defaultLocale=${settings.defaultLanguageCode}; path=/; max-age=31536000; SameSite=Lax`;
      
      const cookiesMap = document.cookie.split(';').reduce((acc, c) => {
        const [k, v] = c.trim().split('=');
        if (k) acc[k] = v;
        return acc;
      }, {} as Record<string, string>);
      
      const userLocale = cookiesMap['userLocale'];
      const pathname = window.location.pathname;
      
      if (!userLocale && (pathname === '/' || pathname === '/en' || pathname === '/en/') && lang !== settings.defaultLanguageCode) {
        window.location.replace(`/${settings.defaultLanguageCode}`);
      }
    }
  }, [settings, lang]);

  return (
     <div
      className={cn(
        'min-h-screen bg-background font-body antialiased',
        'font-body'
      )}
    >
      <FirebaseClientProvider lang={lang} settings={settings}>
        <TranslationProvider lang={lang}>
          <SettingsProvider initialSettings={settings}>
            <FavoritesProvider>
              <WatchHistoryProvider>
                <AppContent>
                  <ConditionalHeaderWrapper>{children}</ConditionalHeaderWrapper>
                  <Footer />
                </AppContent>
                <Toaster />
              </WatchHistoryProvider>
            </FavoritesProvider>
          </SettingsProvider>
        </TranslationProvider>
      </FirebaseClientProvider>
    </div>
  );
}
