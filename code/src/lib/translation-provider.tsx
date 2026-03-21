
'use client';
import { createContext, useContext, type ReactNode, useCallback, useEffect, useState } from 'react';
import type { UITranslations } from '@/lib/types';
import { translationKeys } from '@/lib/translation-keys';
import { getTranslations } from './data.actions';

// English default map
const defaultTranslations = translationKeys.reduce((acc, item) => {
    acc[item.key] = item.default;
    return acc;
}, {} as Record<string, string>);

interface TranslationContextValue {
    languageCode: string;
    t: (key: string, replacements?: Record<string, string | number>) => string;
    loading: boolean;
    isRTL: boolean;
}

const TranslationContext = createContext<TranslationContextValue | null>(null);

export function TranslationProvider({ children, lang }: { children: ReactNode, lang: string }) {
    const [translations, setTranslations] = useState<UITranslations | null>(null);
    const [loading, setLoading] = useState(true);

    const rtlLocales = ['ar', 'fa', 'he', 'ur'];
    const isRTL = rtlLocales.includes(lang);

    useEffect(() => {
        setLoading(true);
        getTranslations(lang).then(data => {
            setTranslations(data);
            setLoading(false);
        });
    }, [lang]);

    const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
        // 1. Try to get translation from the current language object
        const translatedValue = translations ? (translations as any)[key] : null;
        
        let translation = '';

        if (translatedValue && translatedValue.trim() !== '') {
            translation = translatedValue;
        } else if (defaultTranslations[key]) {
            // 2. Fallback to English static defaults if known
            translation = defaultTranslations[key];
        } else {
            // 3. Robust Handle for dynamic keys (page titles/content)
            // If it's a dynamic page key, return empty string so caller can fallback to original DB value
            if (key.startsWith('page_title_') || key.startsWith('page_content_')) {
                return '';
            }
            // If it's a static key but missing from translationKeys.ts, just return the key for debugging
            return key;
        }

        if (replacements) {
            Object.entries(replacements).forEach(([placeholder, value]) => {
                translation = translation.replace(`{${placeholder}}`, String(value));
            });
        }
        return translation;
    }, [translations]);


    const value = {
        languageCode: lang,
        t,
        loading,
        isRTL,
    };

    return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>;
}

export function useTranslation() {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within a TranslationProvider');
    }
    return context;
}
