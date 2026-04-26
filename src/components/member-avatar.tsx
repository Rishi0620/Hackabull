'use client'

import { cn } from '@/lib/utils'
import { MemberColor, MEMBER_COLOR_MAP } from '@/lib/types'

interface MemberAvatarProps {
  name: string
  color: MemberColor | string  // accepts both named colors and hex strings from API
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-lg',
  lg: 'w-20 h-20 text-3xl',
}

export function MemberAvatar({ name, color, size = 'md', className }: MemberAvatarProps) {
  const initial = name.charAt(0).toUpperCase()
  const isHex = color?.startsWith('#')

  // Hex color from real API — use inline style
  if (isHex) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center font-bold text-white shrink-0',
          sizeClasses[size],
          className
        )}
        style={{ backgroundColor: color }}
        aria-label={name}
        role="img"
      >
        {initial}
      </div>
    )
  }

  // Named color from v0 mock data — use Tailwind class
  const colorStyles = MEMBER_COLOR_MAP[color as MemberColor] || MEMBER_COLOR_MAP.teal
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        colorStyles.bg,
        sizeClasses[size],
        className
      )}
      aria-label={name}
      role="img"
    >
      {initial}
    </div>
  )
}
