'use client';

export function VoiceWave({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-1.5 bg-accent rounded-full animate-pulse"
          style={{
            height: `${20 + ((i % 3) + 1) * 8}px`,
            animationDelay: `${i * 80}ms`,
            animationDuration: '700ms',
          }}
        />
      ))}
    </div>
  );
}
