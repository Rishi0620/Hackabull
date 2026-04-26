'use client'

import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MicButtonProps {
  isListening: boolean
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function MicButton({ isListening, onClick, disabled, className }: MicButtonProps) {
  return (
    <div className={cn('relative', className)}>
      {/* Pulse rings when listening */}
      {isListening && (
        <>
          <div 
            className="absolute inset-0 rounded-full bg-med-danger animate-pulse-ring"
            aria-hidden="true"
          />
          <div 
            className="absolute inset-0 rounded-full bg-med-danger animate-pulse-ring"
            style={{ animationDelay: '0.5s' }}
            aria-hidden="true"
          />
        </>
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'relative w-24 h-24 rounded-full flex items-center justify-center transition-all',
          'focus-visible:ring-4 focus-visible:ring-med-accent/50 focus-visible:outline-none',
          'active:scale-95',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isListening ? 'bg-med-danger' : 'bg-med-accent'
        )}
        aria-label={isListening ? 'Stop listening' : 'Start listening'}
        aria-pressed={isListening}
      >
        {isListening ? (
          <MicOff className="w-10 h-10 text-white" aria-hidden="true" />
        ) : (
          <Mic className="w-10 h-10 text-white" aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
