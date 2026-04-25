'use client';

import { Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  listening: boolean;
  onClick: () => void;
  className?: string;
};

export function MicButton({ listening, onClick, className }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={listening ? 'Stop listening' : 'Start voice command'}
      className={cn(
        'relative w-24 h-24 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-2xl',
        listening
          ? 'bg-danger text-white'
          : 'bg-accent text-bg',
        className
      )}
    >
      {listening && (
        <>
          <span className="absolute inset-0 rounded-full bg-danger animate-ping opacity-30" />
          <span className="absolute -inset-2 rounded-full border-2 border-danger animate-pulse" />
        </>
      )}
      {listening ? <MicOff className="w-10 h-10" /> : <Mic className="w-10 h-10" />}
    </button>
  );
}
