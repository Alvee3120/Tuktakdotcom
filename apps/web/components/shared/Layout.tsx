import { cn } from '@/lib/utils';

import type { ReactNode } from 'react';

type SectionProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  as?: 'section' | 'div';
};

/** Full-width section with responsive vertical padding */
export function Section({ children, className, id, as: Component = 'section' }: SectionProps) {
  return (
    <Component id={id} className={cn('section-padding', className)}>
      {children}
    </Component>
  );
}

type ContainerProps = {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

/** Centered container with max-width constraints */
export function Container({ children, className, size = 'xl' }: ContainerProps) {
  const sizeClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={cn('mx-auto w-full px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}>
      {children}
    </div>
  );
}

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
};

/** Section heading with title + optional subtitle */
export function SectionHeading({
  title,
  subtitle,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn('mb-8', align === 'center' && 'text-center', className)}>
      <h2 className="text-heading-lg text-foreground">{title}</h2>
      {subtitle && <p className="text-body-md text-muted-foreground mt-2">{subtitle}</p>}
    </div>
  );
}
