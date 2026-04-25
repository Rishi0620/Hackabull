import { cn } from '@/lib/utils';

export function Badge({
  variant = 'default',
  className,
  children,
}: {
  variant?: 'default' | 'danger' | 'caution' | 'ok' | 'info';
  className?: string;
  children: React.ReactNode;
}) {
  const styles: Record<string, string> = {
    default: 'bg-card text-fg border-border',
    danger: 'bg-danger/15 text-danger border-danger/30',
    caution: 'bg-caution/15 text-caution border-caution/30',
    ok: 'bg-ok/15 text-ok border-ok/30',
    info: 'bg-accent/15 text-accent border-accent/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium',
        styles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
