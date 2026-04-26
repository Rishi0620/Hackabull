'use client'

import { cn } from '@/lib/utils'

interface VoiceWavesProps {
  isActive: boolean
  className?: string
}

export function VoiceWaves({ isActive, className }: VoiceWavesProps) {
  if (!isActive) return null

  return (
    <div 
      className={cn('flex items-center justify-center gap-1 h-8', className)}
      aria-hidden="true"
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-med-accent rounded-full animate-wave"
          style={{
            height: '100%',
            animationDelay: `${i * 0.15}s`,
          }}
        />
      ))}
    </div>
  )
}
