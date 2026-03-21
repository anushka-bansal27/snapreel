
'use client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetClose,
} from '@/components/ui/sheet';
import { useAuth, useUser } from '@/firebase';
import { signOut } from 'firebase/auth';
import { LogOut, User as UserIcon, Wallet, Coins, Heart, Gift, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import type { MonetizationSettings, RewardsSettings } from '@/lib/types';
import { useParams } from 'next/navigation';
import { i18n } from '@/i18n-config';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/translation-provider';
import { getRewardSettings, getMonetizationSettings } from '@/lib/data.actions';
import { useIsMobile } from '@/hooks/use-mobile';

export function UserButton() {
  const auth = useAuth();
  const { user, userProfile, loading } = useUser();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { t } = useTranslation();
  const params = useParams();
  const lang = (params?.lang as string) || i18n.defaultLocale;
  const langPrefix = lang === i18n.defaultLocale ? '' : `/${lang}`;
  const [mounted, setMounted] = useState(false);
  const [monetizationSettings, setMonetizationSettings] = useState<MonetizationSettings | null>(null);
  const [rewardSettings, setRewardSettings] = useState<RewardsSettings | null>(null);

  useEffect(() => {
    setMounted(true);
    getMonetizationSettings().then(setMonetizationSettings);
    getRewardSettings().then(rewardData => {
        if (rewardData) setRewardSettings(rewardData);
    });
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast({
        title: t('user_button_toast_signout_success_title'),
        description: t('user_button_toast_signout_success_desc'),
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: t('user_button_toast_signout_fail_title'),
        description: error.message,
      });
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name[0].toUpperCase();
  };
  
  const isCoinSystemActive = monetizationSettings?.isCoinsActive !== false;
  const isRewardsEnabled = rewardSettings?.isEnabled !== false;

  if (!mounted || loading) {
      return <Skeleton className="h-10 w-10 rounded-full" />;
  }
  
  if (!user) {
    return null;
  }

  const UserInfo = () => (
    <div className="flex flex-col space-y-1">
        <p className="text-base font-black leading-none text-white tracking-tight">
            {userProfile?.displayName || user.displayName || 'User'}
        </p>
        <p className="text-xs leading-none text-muted-foreground pt-1">
            {user.email}
        </p>
        {userProfile?.publicId && (
            <p className="text-xs leading-none text-muted-foreground pt-1 opacity-60">
                ID: {userProfile.publicId}
            </p>
        )}
    </div>
  );

  const NavItems = (props: { onSelect?: () => void }) => (
    <div className="flex flex-col gap-1">
        <Link href={`${langPrefix}/profile`} onClick={props.onSelect} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/5 group transition-colors">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <UserIcon className="h-4 w-4 text-white/60 group-hover:text-primary" />
            </div>
            <span className="text-sm font-bold text-white/80 group-hover:text-white">{t('user_menu_profile')}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-white/20" />
        </Link>
        
        <Link href={`${langPrefix}/my-list`} onClick={props.onSelect} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/5 group transition-colors">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Heart className="h-4 w-4 text-white/60 group-hover:text-primary" />
            </div>
            <span className="text-sm font-bold text-white/80 group-hover:text-white">{t('user_menu_my_list')}</span>
            <ChevronRight className="ml-auto h-4 w-4 text-white/20" />
        </Link>
        
        {isRewardsEnabled && (
            <Link href={`${langPrefix}/rewards`} onClick={props.onSelect} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-amber-500/5 group transition-colors">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                    <Gift className="h-4 w-4 text-amber-500" />
                </div>
                <span className="text-sm font-bold text-amber-500">{t('user_menu_rewards')}</span>
                <ChevronRight className="ml-auto h-4 w-4 text-amber-500/20" />
            </Link>
        )}

        {isCoinSystemActive && (
            <Link href={`${langPrefix}/wallet`} onClick={props.onSelect} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-white/5 group transition-colors">
                <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Wallet className="h-4 w-4 text-white/60 group-hover:text-primary" />
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-white/80 group-hover:text-white">{t('user_menu_wallet')}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                        <Coins className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-black text-amber-400">{(userProfile?.coins || 0).toLocaleString()}</span>
                    </div>
                </div>
                <ChevronRight className="ml-auto h-4 w-4 text-white/20" />
            </Link>
        )}
    </div>
  );

  if (isMobile) {
      return (
          <Sheet>
              <SheetTrigger asChild>
                <button className="relative h-10 w-10 rounded-full p-0 overflow-hidden outline-none ring-0">
                    <Avatar className="h-10 w-10 border-2 border-primary">
                        {userProfile?.photoURL && <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName || 'User'} />}
                        <AvatarFallback className="bg-zinc-800 text-white font-black">{getInitials(userProfile?.displayName || user.displayName)}</AvatarFallback>
                    </Avatar>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-zinc-950 border-l-zinc-800 p-0 flex flex-col">
                  <SheetHeader className="sr-only">
                      <SheetTitle>User Account Menu</SheetTitle>
                  </SheetHeader>
                  <div className="p-6 pt-12 space-y-8 flex-1">
                      <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/5">
                          <Avatar className="h-14 w-14 border-2 border-primary shadow-xl">
                            {userProfile?.photoURL && <AvatarImage src={userProfile.photoURL} />}
                            <AvatarFallback className="bg-zinc-800 text-white text-xl font-black">{getInitials(userProfile?.displayName || user.displayName)}</AvatarFallback>
                          </Avatar>
                          <UserInfo />
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] px-3 mb-2">{t('user_menu_my_account')}</p>
                        <NavItems onSelect={() => {}} />
                      </div>
                  </div>
                  
                  <div className="p-6 border-t border-white/5">
                      <Button variant="ghost" onClick={handleSignOut} className="w-full justify-start h-14 rounded-2xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive group">
                          <LogOut className="mr-3 h-5 w-5 group-hover:animate-pulse" />
                          <span className="font-bold">{t('user_menu_logout')}</span>
                      </Button>
                  </div>
              </SheetContent>
          </Sheet>
      );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative h-10 w-10 rounded-full p-0 overflow-hidden outline-none ring-0">
          <Avatar className="h-10 w-10 border-2 border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background">
            {userProfile?.photoURL && <AvatarImage src={userProfile.photoURL} alt={userProfile.displayName || 'User'} />}
            <AvatarFallback className="bg-zinc-800 text-white font-black">{getInitials(userProfile?.displayName || user.displayName)}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-zinc-950 border-zinc-800 shadow-2xl p-2 rounded-xl mt-2" align="end" sideOffset={10}>
        <DropdownMenuLabel className="font-normal py-4 px-3">
          <UserInfo />
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-zinc-800" />
        
        <div className="py-1">
            <DropdownMenuItem asChild className="cursor-pointer py-3 rounded-lg focus:bg-white/5 group">
                <Link href={`${langPrefix}/profile`}>
                    <UserIcon className="mr-3 h-4 w-4 text-white/40 group-focus:text-white" />
                    <span className="text-sm font-bold text-white/80 group-focus:text-white">{t('user_menu_profile')}</span>
                </Link>
            </DropdownMenuItem>
            
            <DropdownMenuItem asChild className="cursor-pointer py-3 rounded-lg focus:bg-white/5 group">
                <Link href={`${langPrefix}/my-list`}>
                    <Heart className="mr-3 h-4 w-4 text-white/40 group-focus:text-white" />
                    <span className="text-sm font-bold text-white/80 group-focus:text-white">{t('user_menu_my_list')}</span>
                </Link>
            </DropdownMenuItem>
            
            {isRewardsEnabled && (
                <DropdownMenuItem asChild className="cursor-pointer py-3 rounded-lg focus:bg-amber-500/10 group">
                    <Link href={`${langPrefix}/rewards`}>
                        <Gift className="mr-3 h-4 w-4 text-amber-500 group-focus:text-amber-500" />
                        <span className="text-sm font-bold text-amber-500 group-focus:text-amber-500">{t('user_menu_rewards')}</span>
                    </Link>
                </DropdownMenuItem>
            )}

            {isCoinSystemActive && (
                <DropdownMenuItem asChild className="cursor-pointer py-3 rounded-lg focus:bg-white/5 group">
                    <Link href={`${langPrefix}/wallet`} className="flex items-center w-full">
                        <Wallet className="mr-3 h-4 w-4 text-white/40 group-focus:text-white" />
                        <span className="text-sm font-bold text-white/80 group-focus:text-white">{t('user_menu_wallet')}</span>
                        <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-amber-400/10 rounded-full">
                            <Coins className="h-3 w-3 text-amber-400" />
                            <span className="text-xs font-black text-amber-400">{(userProfile?.coins || 0).toLocaleString()}</span>
                        </div>
                    </Link>
                </DropdownMenuItem>
            )}
        </div>

        <DropdownMenuSeparator className="bg-zinc-800" />
        
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer py-3 rounded-lg focus:bg-destructive/10 group mt-1">
          <LogOut className="mr-3 h-4 w-4 text-muted-foreground group-focus:text-destructive" />
          <span className="text-sm font-bold text-muted-foreground group-focus:text-destructive">{t('user_menu_logout')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
