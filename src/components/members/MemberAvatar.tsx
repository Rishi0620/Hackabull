import { cn } from '@/lib/utils';

type Props = {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

export function MemberAvatar({ name, color, size = 'md', className }: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-20 h-20 text-3xl',
  };
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-bold text-white shrink-0',
        sizes[size],
        className
      )}
      style={{ backgroundColor: color }}
      aria-label={name}
    >
      {initial}
    </div>
  );
}
