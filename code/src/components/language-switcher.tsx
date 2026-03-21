
'use client';

import { usePathname, useRouter, useParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe, Check } from 'lucide-react';
import type { Language } from '@/lib/types';
import { i18n } from '@/i18n-config';
import { Skeleton } from './ui/skeleton';
import { useMemo, useState, useEffect } from 'react';
import { getAllLanguages } from '@/lib/data.actions';
import Image from 'next/image';

export function LanguageSwitcher({ isMobile = false }: { isMobile?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const currentLocale = (params?.lang as string) || i18n.defaultLocale;

  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllLanguages().then(data => {
        setLanguages(data);
        setLoading(false);
    });
  }, []);

  const currentLanguage = useMemo(() => {
    return languages?.find(l => l.languageCode === currentLocale);
  }, [languages, currentLocale]);

  const handleLocaleChange = (newLocale: string) => {
    document.cookie = `userLocale=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    const segments = pathname ? pathname.split('/').filter(Boolean) : [];
    if (segments.length > 0 && i18n.locales.includes(segments[0] as any)) segments.shift();
    let newPath = `/${segments.join('/')}`;
    if (newLocale !== i18n.defaultLocale) newPath = `/${newLocale}${newPath}`;
    if (newPath === `/${newLocale}/` || newPath === `/${newLocale}`) newPath = newLocale === i18n.defaultLocale ? '/' : `/${newLocale}`;
    if (newPath.endsWith('/') && newPath.length > 1) newPath = newPath.slice(0, -1);
    if (newPath === '') newPath = '/';
    router.push(newPath);
  };
  
  if (loading) return <Skeleton className="h-8 w-8 rounded-full" />;
  if (!languages || languages.length <= 1) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-2 px-1">
          {currentLanguage ? (
            <Image
                src={`https://flagcdn.com/w20/${currentLanguage.countryCode.toLowerCase()}.png`}
                alt={`${currentLanguage.name} flag`}
                width={20}
                height={15}
                className="rounded-sm"
            />
          ) : (
            <Globe className="h-5 w-5" />
          )}
          {!isMobile && <span className="hidden sm:inline text-xs uppercase font-bold">{currentLocale}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="z-[100]">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.languageCode}
            onClick={() => handleLocaleChange(lang.languageCode)}
            className="cursor-pointer"
          >
            <Image
                src={`https://flagcdn.com/w20/${lang.countryCode.toLowerCase()}.png`}
                alt={`${lang.name} flag`}
                width={20}
                height={15}
                className="mr-2 rounded-sm"
            />
            <span>{lang.name}</span>
            {currentLocale === lang.languageCode && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
