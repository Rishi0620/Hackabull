'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Pill, Mic, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const tabs = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/cabinet', label: 'Cabinet', icon: Pill },
    { href: '/scan/bottle', label: 'Scan', icon: Camera },
    { href: '/voice', label: 'Voice', icon: Mic },
  ];

  return (
    <div className="min-h-svh flex flex-col">
      <main className="flex-1 pb-24">{children}</main>
      <nav
        aria-label="Primary"
        className="fixed bottom-0 left-0 right-0 bg-bg/95 backdrop-blur border-t border-border z-30"
      >
        <ul className="grid grid-cols-4 max-w-md mx-auto">
          {tabs.map((t) => {
            const Icon = t.icon;
            const active =
              path === t.href || (t.href !== '/' && path?.startsWith(t.href));
            return (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className={cn(
                    'flex flex-col items-center gap-1 py-3 px-2 text-xs font-medium',
                    active ? 'text-accent' : 'text-muted'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  {t.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
