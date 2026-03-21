'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/header';
import type { ReactNode } from 'react';

export function ConditionalHeaderWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const isAdminRoute = pathname?.startsWith('/admin') ?? false;

    if (isAdminRoute) {
        return <>{children}</>;
    }

    return (
      <div className="relative flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
      </div>
    );
}
