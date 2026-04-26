'use client'

import { Pill, ChevronRight, Shield, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Medication, MEMBER_COLOR_MAP } from '@/lib/types'
import Link from 'next/link'

interface MedCardProps {
  medication: Medication
  className?: string
}

// Resolve color: API returns hex strings, v0 mock uses named colors
function resolveColorStyles(avatarColor: string) {
  if (!avatarColor) return MEMBER_COLOR_MAP.teal
  if (avatarColor.startsWith('#')) {
    return {
      bg: '',
      text: '',
      bgFaded: '',
      hex: avatarColor,
      _hex: avatarColor,
    }
  }
  return MEMBER_COLOR_MAP[avatarColor as keyof typeof MEMBER_COLOR_MAP] || MEMBER_COLOR_MAP.teal
}

export function MedCard({ medication, className }: MedCardProps) {
  const colorStyles = resolveColorStyles(medication.member?.avatarColor ?? '')
  const hex = colorStyles.hex
  const hasDangerWarning = medication.warnings.some(w => {
    const text = typeof w === 'string' ? w : (w as any).text ?? ''
    return text.toLowerCase().includes('serious') ||
      text.toLowerCase().includes('danger') ||
      text.toLowerCase().includes('fatal') ||
      (w as any).severity === 'danger'
  })

  return (
    <Link
      href={`/medication/${medication._id}`}
      className={cn(
        'block w-full rounded-2xl bg-med-card p-4 transition-colors',
        'focus-visible:ring-4 focus-visible:ring-med-accent/50 focus-visible:outline-none',
        'active:bg-med-border',
        className
      )}
      aria-label={`${medication.brandName}, ${medication.dosage.raw}, for ${medication.member.name}`}
    >
      <div className="flex items-center gap-4">
        {/* Icon container */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${hex}20`, color: hex }}
        >
          <Pill className="w-7 h-7" aria-hidden="true" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-fg truncate">{medication.brandName}</p>
          {medication.genericName && (
            <p className="text-med-muted text-base truncate">{medication.genericName}</p>
          )}
          <p className="text-med-muted text-base">{medication.dosage.raw}</p>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span
              className="text-sm px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${hex}20`, color: hex }}
            >
              For {medication.member.name}
            </span>
            {medication.fdaVerified && (
              <span className="text-sm px-2 py-0.5 rounded-full bg-med-ok/15 text-med-ok flex items-center gap-1">
                <Shield className="w-3 h-3" aria-hidden="true" />
                FDA
              </span>
            )}
            {hasDangerWarning && (
              <span className="text-sm px-2 py-0.5 rounded-full bg-med-danger/15 text-med-danger flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                Warning
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="w-6 h-6 text-med-muted shrink-0" aria-hidden="true" />
      </div>
    </Link>
  )
}
