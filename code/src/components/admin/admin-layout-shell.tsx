
'use client';

import { usePathname } from 'next/navigation';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  Shapes,
  Clapperboard,
  Flame,
  Bell,
  Flag,
  Coins,
  Settings,
  Megaphone,
  CreditCard,
  Globe,
  BookText,
  Mail,
  HardDrive,
  Eye,
  EyeOff,
  ChevronDown,
  Puzzle,
  ShieldCheck,
  Database,
  Search,
  Zap,
  Gift,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import Link from 'next/link';
import { UserNav } from '@/components/user-nav';
import { ReactNode, useState } from 'react';
import type { GeneralSettings } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from '@/components/ui/scroll-area';

const Logo = () => (
    <img src="/img/admin-logo.png" alt="Admin Logo" width="32" height="32" className="rounded-lg object-contain" />
);

export function AdminLayoutShell({
  children,
  initialSettings = null,
}: {
  children: ReactNode;
  initialSettings?: GeneralSettings | null;
}) {
  const [showSiteName, setShowSiteName] = useState(true);
  const pathname = usePathname();
    if (
      pathname === '/admin/login' || pathname.endsWith('/admin/login') ||
      pathname === '/admin/forgot-password' || pathname.endsWith('/admin/forgot-password') ||
      pathname === '/admin/reset-password' || pathname.endsWith('/admin/reset-password')
    ) {
      return <>{children}</>;
    }

  const siteName = initialSettings?.siteName || 'SnapReels';

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="p-4">
           <div className="flex items-center justify-between">
              <Link href="/admin" className="flex items-center gap-3 overflow-hidden">
              <Logo />
              {showSiteName && <span className="font-bold text-xl text-white truncate italic tracking-tighter uppercase">{siteName}</span>}
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setShowSiteName(!showSiteName)} className="text-white hover:bg-white/10 flex-shrink-0">
                  {showSiteName ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </Button>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <ScrollArea className="h-full">
          <Collapsible className="group/collapsible" defaultOpen={true}>
              <SidebarGroup>
              <CollapsibleTrigger asChild>
                  <SidebarGroupLabel className="cursor-pointer hover:text-white transition-colors flex items-center justify-between w-full">
                      <span>APP</span>
                      <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                  </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                  <SidebarMenu className="mt-2">
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin'}>
                          <Link href="/admin">
                          <LayoutDashboard />
                          Dashboard
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/users'}>
                          <Link href="/admin/users">
                          <Users />
                          Users
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/mailbox'}>
                          <Link href="/admin/mailbox">
                          <Mail />
                          Mailbox
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/categories'}>
                          <Link href="/admin/categories">
                          <Shapes />
                          Categories
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/series')}>
                          <Link href="/admin/series">
                          <Clapperboard />
                          Dramas
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/notifications'}>
                          <Link href="/admin/notifications">
                          <Bell />
                          Notification
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/reports'}>
                          <Link href="/admin/reports">
                          <Flag />
                          Reports
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/coin-packs'}>
                          <Link href="/admin/coin-packs">
                          <Coins />
                          Coin Packs
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/rewards'}>
                          <Link href="/admin/rewards">
                          <Gift />
                          Rewards System
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === '/admin/ads'}>
                          <Link href="/admin/ads">
                          <Megaphone />
                          Ads
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                      <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname.startsWith('/admin/pages')}>
                          <Link href="/admin/pages">
                          <BookText />
                          Pages
                          </Link>
                      </SidebarMenuButton>
                      </SidebarMenuItem>
                  </SidebarMenu>
              </CollapsibleContent>
              </SidebarGroup>
          </Collapsible>

          <SidebarSeparator />
          
          <Collapsible className="group/collapsible" defaultOpen={pathname.includes('/settings/')}>
            <SidebarGroup>
                <CollapsibleTrigger asChild>
                    <SidebarGroupLabel className="cursor-pointer hover:text-white transition-colors flex items-center justify-between w-full">
                        <span>SETTINGS</span>
                        <ChevronDown className="h-3 w-3 transition-transform group-data-[state=open]/collapsible:rotate-180" />
                    </SidebarGroupLabel>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenu className="mt-2">
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/general'}>
                        <Link href="/admin/settings/general">
                            <Settings />
                            General
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/seo'}>
                        <Link href="/admin/settings/seo">
                            <Search />
                            SEO & Metadata
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/performance'}>
                        <Link href="/admin/settings/performance">
                            <Zap />
                            Performance & PWA
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/plugins'}>
                        <Link href="/admin/settings/plugins">
                            <Puzzle />
                            Plugins
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/auth'}>
                        <Link href="/admin/settings/auth">
                            <ShieldCheck />
                            Authentication
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/security'}>
                        <Link href="/admin/settings/security">
                            <ShieldAlert />
                            Security
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/backup'}>
                        <Link href="/admin/settings/backup">
                            <Database />
                            Backup & Restore
                        </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                        <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/payment-gateway'}>
                            <Link href="/admin/settings/payment-gateway">
                            <CreditCard />
                            Payment Gateway
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/languages'}>
                            <Link href="/admin/languages">
                            <Globe />
                            Languages
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/mobile'}>
                            <Link href="/admin/settings/mobile">
                            <Smartphone />
                            Mobile App
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                        <SidebarMenuButton asChild isActive={pathname === '/admin/settings/storage'}>
                            <Link href="/admin/settings/storage">
                            <HardDrive />
                            Storage
                            </Link>
                        </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
          </ScrollArea>
        </SidebarContent>
      </Sidebar>
      <SidebarInset className="w-full min-w-0">
        <header className="flex items-center justify-between p-4 border-b h-16 w-full">
          <SidebarTrigger />
          <UserNav />
        </header>
        <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-6 lg:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

