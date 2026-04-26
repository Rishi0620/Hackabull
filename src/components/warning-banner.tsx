'use client'

import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface WarningBannerProps {
  severity: 'danger' | 'caution' | 'info'
  title: string
  message: string
  action?: ReactNode
  className?: string
}

const severityConfig = {
  danger: {
    icon: AlertTriangle,
    borderColor: 'border-med-danger',
    bgColor: 'bg-med-danger/10',
    iconColor: 'text-med-danger',
    titleColor: 'text-med-danger',
  },
  caution: {
    icon: AlertCircle,
    borderColor: 'border-med-caution',
    bgColor: 'bg-med-caution/10',
    iconColor: 'text-med-caution',
    titleColor: 'text-med-caution',
  },
  info: {
    icon: Info,
    borderColor: 'border-med-accent',
    bgColor: 'bg-med-accent/10',
    iconColor: 'text-med-accent',
    titleColor: 'text-med-accent',
  },
}

export function WarningBanner({ severity, title, message, action, className }: WarningBannerProps) {
  const config = severityConfig[severity]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'w-full rounded-2xl border-2 p-4',
        config.borderColor,
        config.bgColor,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={cn('w-6 h-6 shrink-0 mt-0.5', config.iconColor)} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={cn('font-bold text-lg', config.titleColor)}>{title}</p>
          <p className="text-fg/90 mt-1">{message}</p>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  )
}
