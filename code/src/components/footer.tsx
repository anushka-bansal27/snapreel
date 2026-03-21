'use client';

import { useState, useEffect } from 'react';
import type { CustomPage } from '@/lib/types';
import { Facebook, Instagram, Twitter, Youtube, Music2, Apple } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useSettings } from '@/lib/settings-provider';
import { useTranslation } from '@/lib/translation-provider';
import { getCustomPages } from '@/lib/data.actions';
import { cn } from '@/lib/utils';

const socialIcons: { [key: string]: React.ElementType } = {
    facebook: Facebook,
    instagram: Instagram,
    twitter: Twitter,
    youtube: Youtube,
    tiktok: Music2,
};

function FooterSkeleton() {
    return (
        <footer className="bg-card/30 mt-auto border-t border-white/5">
            <div className="container mx-auto px-4 py-16 text-center">
                <div className="flex flex-col items-center gap-12">
                    <div className="flex gap-4">
                         <Skeleton className="h-10 w-32 rounded-xl" />
                         <Skeleton className="h-10 w-32 rounded-xl" />
                    </div>
                    <div className="flex gap-8">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                    <Skeleton className="h-5 w-72" />
                </div>
            </div>
        </footer>
    );
}

export function Footer() {
    const params = useParams();
    const settings = useSettings();
    const { t } = useTranslation();
    const lang = (params?.lang as string) || i18n.defaultLocale;
    const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
    
    const [pages, setPages] = useState<CustomPage[]>([]);
    const [pagesLoading, setPagesLoading] = useState(true);

    useEffect(() => {
        getCustomPages().then(data => {
            setPages(data.filter(p => p.showInFooter === true || String(p.showInFooter) === 'true'));
            setPagesLoading(false);
        }).catch(() => {
            setPagesLoading(false);
        });
    }, []);

    if (pagesLoading) return <FooterSkeleton />;

    const defaultCopyright = `© 2026 SnapReels. All rights reserved.`;
    const showCopyright = settings?.showCopyright !== false;
    const showVersion = settings?.showVersion === true;
    const appVersion = settings?.appVersion || '1.0.0';

    const StoreBadge = ({ href, type }: { href: string; type: 'apple' | 'google' }) => (
        <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="transition-all hover:scale-105 active:scale-95 inline-block"
        >
            <img 
                src={type === 'apple' ? '/images/appstore.png' : '/images/googleplay.png'} 
                alt={type === 'apple' ? 'Download on the App Store' : 'Get it on Google Play'} 
                className="h-[42px] w-auto object-contain"
            />
        </a>
    );

    const hasStoreLinks = !!(settings?.appStoreUrl || settings?.playStoreUrl);

    return (
        <footer className="bg-background mt-auto border-t border-white/5 relative overflow-hidden">
            <div className="container mx-auto px-4 pt-16 pb-12 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center md:text-left mb-16">
                    
                    {/* 1. BRAND & DESCRIPTION */}
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <Link href={langPrefix || '/'} className="flex items-center gap-2 mb-2">
                            {settings?.logoUrl ? (
                                <img src={settings.logoUrl} alt={settings.siteName || 'SnapReels'} className="h-8 w-auto object-contain" />
                            ) : (
                                <div className="bg-primary text-primary-foreground font-bold rounded-lg w-8 h-8 flex items-center justify-center text-lg">
                                    {settings?.siteName ? settings.siteName.charAt(0).toUpperCase() : 'S'}
                                </div>
                            )}
                            <span className="text-xl font-bold tracking-tight text-white">
                                {settings?.siteName || 'SnapReels'}
                            </span>
                        </Link>
                        <p className="text-sm text-white/50 max-w-xs leading-relaxed">
                            {t('hero_subtitle') === 'hero_subtitle' ? 'Watch premium short dramas anywhere, anytime.' : t('hero_subtitle')}
                        </p>
                    </div>

                    {/* 2. QUICK LINKS & SOCIALS */}
                    <div className="flex flex-col items-center md:items-center gap-6">
                        <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3">
                            {pages?.map(page => (
                                <Link 
                                    key={page.id} 
                                    href={`${langPrefix}/p/${page.slug}`} 
                                    className="text-[11px] font-bold text-white/70 hover:text-white hover:underline transition-all uppercase tracking-wider"
                                >
                                    {t(`page_title_${page.slug}`) || page.title}
                                </Link>
                            ))}
                            <Link 
                                href={`${langPrefix}/contact`} 
                                className="text-[11px] font-bold text-white/70 hover:text-white hover:underline transition-all uppercase tracking-wider"
                            >
                                {t('footer_contact_us') === 'footer_contact_us' ? 'Contact Us' : t('footer_contact_us')}
                            </Link>
                        </div>

                         {settings?.showSocialsInFooter && settings?.socials && (
                            <div className="flex justify-center gap-6 mt-4">
                                {Object.entries(settings.socials).map(([key, url]) => {
                                    const Icon = socialIcons[key];
                                    if (!url || !Icon) return null;
                                    return (
                                        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-white transition-all hover:scale-110 duration-300 bg-white/5 p-2 rounded-full">
                                            <Icon className="h-4 w-4" />
                                            <span className="sr-only">{key}</span>
                                        </a>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* 3. GET THE APP */}
                    <div className="flex flex-col items-center md:items-end gap-4">
                        <span className="text-sm font-semibold text-white/80 uppercase tracking-widest">
                            {t('get_app_title') === 'get_app_title' ? 'Get the App' : t('get_app_title')}
                        </span>
                        {hasStoreLinks && (
                            <div className="flex flex-col gap-3">
                                {settings?.appStoreUrl && <StoreBadge href={settings.appStoreUrl} type="apple" />}
                                {settings?.playStoreUrl && <StoreBadge href={settings.playStoreUrl} type="google" />}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 4. ABSOLUTE BOTTOM SECTION */}
                <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4">
                    {showCopyright && (
                        <div className="text-[10px] font-medium text-white/40 tracking-wider text-center md:text-left">
                            {t('footer_copyright_text') || settings?.copyrightText || defaultCopyright}
                        </div>
                    )}
                    {showVersion && (
                        <div className="text-[10px] font-medium text-white/20 tracking-wider text-center md:text-right">
                            v{appVersion}
                        </div>
                    )}
                </div>
            </div>

            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none translate-x-1/2 translate-y-1/2" />
        </footer>
    );
}
