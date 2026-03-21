
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
import { logout } from '@/lib/actions';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { getAdminProfile } from '@/lib/data.actions';
import type { AdminProfile } from '@/lib/types';
import Link from 'next/link';

const AdminLogoSVG = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="40" height="40" rx="10" fill="url(#paint0_linear_admin_nav)"/>
        <path d="M28 20L17 27V13L28 20Z" fill="black"/>
        <defs>
            <linearGradient id="paint0_linear_admin_nav" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
                <stop stopColor="#FF8C42"/>
                <stop offset="1" stopColor="#F857A6"/>
            </linearGradient>
        </defs>
    </svg>
);

export function UserNav() {
  const [mounted, setMounted] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    getAdminProfile().then(profile => {
        setAdminProfile(profile);
        setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
  };
  
  if (!mounted || loading) {
    return <Skeleton className="h-10 w-10 rounded-full" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0 overflow-hidden ring-2 ring-primary/20">
          <AdminLogoSVG />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{adminProfile?.displayName || 'Admin'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {adminProfile?.email || 'admin@snapreels.com'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
         <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/admin/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
