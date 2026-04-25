'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/50 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-bg hover:bg-accent/90',
        secondary: 'bg-card text-fg border border-border hover:bg-card/80',
        ghost: 'bg-transparent text-fg hover:bg-card',
        danger: 'bg-danger text-white hover:bg-danger/90',
        outline: 'bg-transparent text-fg border border-border hover:bg-card',
      },
      size: {
        default: 'h-14 px-6 text-base',
        sm: 'h-11 px-4 text-sm',
        lg: 'h-20 px-8 text-xl',
        xl: 'h-28 px-10 text-2xl',
        icon: 'h-14 w-14',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = 'Button';

export { buttonVariants };
