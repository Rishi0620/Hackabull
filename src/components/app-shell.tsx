'use client'

import { Home, Pill, Camera, Mic } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
  hideNav?: boolean
}

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/cabinet', icon: Pill, label: 'Cabinet' },
  { href: '/scan/bottle', icon: Camera, label: 'Scan' },
  { href: '/voice', icon: Mic, label: 'Voice' },
]

export function AppShell({ children, hideNav }: AppShellProps) {
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Main content area */}
      <main className={cn(
        'flex-1 w-full max-w-[430px] mx-auto',
        !hideNav && 'pb-24'
      )}>
        {children}
      </main>

      {/* Bottom navigation */}
      {!hideNav && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-40 bg-bg/95 backdrop-blur-sm border-t border-med-border"
          aria-label="Main navigation"
        >
          <div className="max-w-[430px] mx-auto flex items-center justify-around py-3">
            {navItems.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || 
                (href !== '/' && pathname.startsWith(href))

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'flex flex-col items-center justify-center gap-1 min-w-[56px] min-h-[56px] px-3 py-2 rounded-xl transition-colors',
                    'focus-visible:ring-4 focus-visible:ring-med-accent/50 focus-visible:outline-none',
                    isActive ? 'text-med-accent' : 'text-med-muted'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-6 h-6" aria-hidden="true" />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </div>
  )
}
