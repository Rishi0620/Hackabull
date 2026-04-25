import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  severity: 'info' | 'caution' | 'danger';
  title: string;
  message: string;
  action?: React.ReactNode;
};

export function WarningBanner({ severity, title, message, action }: Props) {
  const styles = {
    info: 'bg-accent/10 border-accent text-fg',
    caution: 'bg-caution/10 border-caution text-fg',
    danger: 'bg-danger/10 border-danger text-fg',
  };
  const Icon = severity === 'danger' ? AlertTriangle : severity === 'caution' ? AlertCircle : Info;
  const iconColor =
    severity === 'danger' ? 'text-danger' : severity === 'caution' ? 'text-caution' : 'text-accent';

  return (
    <div
      role="alert"
      className={cn('rounded-2xl border-2 p-5 flex items-start gap-4', styles[severity])}
    >
      <Icon className={cn('w-7 h-7 shrink-0 mt-0.5', iconColor)} />
      <div className="flex-1">
        <p className="font-bold text-lg">{title}</p>
        <p className="text-base mt-1 text-fg/80">{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    </div>
  );
}
