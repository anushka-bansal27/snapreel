'use client';
import Link from 'next/link';
import { Search, Menu, User as UserIcon, Heart, LogOut, Wallet, Coins, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useUser, useAuth } from '@/firebase';
import { AuthDialog } from '@/components/auth-dialog';
import { UserButton } from '@/components/user-button';
import { Skeleton } from './ui/skeleton';
import React, { useState, useEffect } from 'react';
import { SearchDialog } from './search-dialog';
import { LanguageSwitcher } from './language-switcher';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useTranslation } from '@/lib/translation-provider';
import { useSettings } from '@/lib/settings-provider';
import Image from 'next/image';
import { getRewardSettings, getMonetizationSettings } from '@/lib/data.actions';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

const StaticLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="8" fill="url(#paint0_linear_1_2)"/>
        <path d="M19.3241 10.3524C18.4441 9.61638 17.2921 9.24838 15.8681 9.24838C13.2361 9.24838 11.2441 10.7004 11.2441 13.0644C11.2441 14.7324 12.1801 15.7404 13.7881 16.6764L14.7001 17.2284C15.9481 17.9884 16.5961 18.6604 16.5961 19.6444C16.5961 20.9004 15.5041 21.8364 14.1241 21.8364C12.6361 21.8364 11.5441 21.1404 10.7401 20.3724L10.1161 21.0684C11.0521 22.0284 12.4561 22.5804 14.1241 22.5804C16.9081 22.5804 18.9001 21.0444 18.9001 18.5964C18.9001 16.6764 17.7721 15.6444 16.1401 14.7084L15.2281 14.1564C14.0041 13.4444 13.4761 12.7964 13.4761 11.9004C13.4761 10.7484 14.4841 9.98038 15.7801 9.98038C17.0761 9.98038 18.0601 10.6044 18.7081 11.2284L19.3241 10.3524Z" fill="white"/>
        <defs>
            <linearGradient id="paint0_linear_1_2" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                <stop stopColor="#F857A6"/>
                <stop offset="1" stopColor="#FF5858"/>
            </linearGradient>
        </defs>
    </svg>
);

const DynamicLogo = () => {
    const settings = useSettings();
    const showName = settings?.showSiteNameNextToLogo !== false;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-shrink-0">
                {settings?.logoUrl ? (
                    <Image src={settings.logoUrl} alt={settings.siteName || 'Site Logo'} width={128} height={32} className="h-8 w-auto object-contain" />
                ) : ( <StaticLogo /> )}
            </div>
            {showName && settings?.siteName && (
                <span className="text-lg font-bold text-white tracking-tight flex items-center h-full">
                    {settings.siteName}
                </span>
            )}
        </div>
    );
};

export function Header() {
  const auth = useAuth();
  const { user, userProfile, loading } = useUser();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;

  return (
    <header className="absolute top-0 z-40 w-full bg-gradient-to-b from-black/80 to-transparent">
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <div className="container mx-auto px-4 flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={langPrefix || '/'} className="hover:opacity-90 transition-opacity">
            <DynamicLogo />
          </Link>
          
          <div className="md:hidden">
            <LanguageSwitcher isMobile />
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium ml-4">
            <Link href={langPrefix || '/'} className="text-white/80 hover:text-white transition-colors">{t('common_home')}</Link>
            <Link href={`${langPrefix}/series`} className="text-white/80 hover:text-white transition-colors">{t('common_categories')}</Link>
            <Link href={`${langPrefix}/my-list`} className="text-white/80 hover:text-white transition-colors">{t('header_my_list')}</Link>
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <div className="hidden md:block">
            <LanguageSwitcher />
          </div>

          <Button variant="ghost" size="icon" className="text-white" onClick={() => setSearchOpen(true)}>
            <Search className="h-5 w-5" />
          </Button>

          {/* User Button visible on ALL screen sizes */}
          <div className="ml-1">
            {loading ? <Skeleton className="h-10 w-10 rounded-full" /> : user ? <UserButton /> : <AuthDialog />}
          </div>

          <div className="md:hidden flex items-center ml-1">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white"><Menu className="h-6 w-6" /></Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] bg-background p-6 border-l-border/50 flex flex-col">
                <SheetHeader className="sr-only"><SheetTitle>{t('header_main_menu')}</SheetTitle></SheetHeader>
                <div className="flex flex-col h-full mt-4">
                    <nav className="flex flex-col gap-5 flex-1">
                        <Link href={langPrefix || '/'} className="flex items-center gap-3 text-base font-medium" onClick={() => setMobileMenuOpen(false)}>
                            {t('common_home')}
                        </Link>
                        <Link href={`${langPrefix}/series`} className="flex items-center gap-3 text-base font-medium" onClick={() => setMobileMenuOpen(false)}>
                            {t('common_categories')}
                        </Link>
                        <Link href={`${langPrefix}/my-list`} className="flex items-center gap-3 text-base font-medium" onClick={() => setMobileMenuOpen(false)}>
                            {t('header_my_list')}
                        </Link>
                        <Link href={`${langPrefix}/contact`} className="flex items-center gap-3 text-base font-medium" onClick={() => setMobileMenuOpen(false)}>
                            {t('footer_contact_us')}
                        </Link>
                    </nav>
                </div>
                </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}
