'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

type PremiumButtonProps = {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
};

const sizeClasses = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-10 px-4 text-sm rounded-lg gap-2',
  lg: 'h-12 px-6 text-base rounded-lg gap-2.5',
  xl: 'h-14 px-8 text-lg rounded-xl gap-3',
};

const variantClasses = {
  primary:
    'bg-primary text-primary-foreground hover:opacity-90 shadow-sm hover:shadow-glow transition-all',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors',
  outline:
    'border border-border bg-transparent text-foreground hover:bg-accent hover:text-accent-foreground transition-colors',
  ghost: 'hover:bg-accent hover:text-accent-foreground transition-colors',
  destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 transition-opacity',
  gradient:
    'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-md hover:shadow-glow-lg transition-all hover:scale-[1.02]',
};

export function PremiumButton({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  onClick,
  type = 'button',
}: PremiumButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center font-semibold transition-all duration-200',
        'focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {rightIcon && !isLoading && <span className="shrink-0">{rightIcon}</span>}
    </Button>
  );
}
