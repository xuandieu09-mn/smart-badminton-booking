import React from 'react';
import { cn } from '../../lib/utils';

/**
 * 🎨 Premium Card Component
 * 
 * Features:
 * - Glassmorphism effect
 * - Soft shadows với subtle borders
 * - Smooth hover animations
 * - Multiple variants
 */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'elevated' | 'gradient' | 'glass';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const cardVariants = {
  default: [
    'bg-white/95',
    'rounded-2xl',
    'shadow-soft',
    'border border-slate-200/60',
    'backdrop-blur-sm',
  ].join(' '),
  
  bordered: [
    'bg-white/90',
    'rounded-2xl',
    'border border-slate-200/80',
    'shadow-sm',
  ].join(' '),
  
  elevated: [
    'bg-gradient-to-br from-white to-slate-50/80',
    'rounded-2xl',
    'shadow-xl shadow-slate-200/40',
    'border border-white/60',
  ].join(' '),
  
  gradient: [
    'rounded-2xl',
    'bg-gradient-to-br from-white via-slate-50 to-slate-100/50',
    'shadow-lg shadow-slate-200/30',
    'border border-slate-100',
  ].join(' '),

  glass: [
    'bg-white/70',
    'backdrop-blur-xl',
    'rounded-2xl',
    'shadow-glass',
    'border border-white/40',
  ].join(' '),
};

const cardPadding = {
  none: '',
  sm: 'p-4',
  md: 'p-5 md:p-6',
  lg: 'p-6 md:p-8',
};

export const Card: React.FC<CardProps> = ({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
  ...props
}) => {
  return (
    <div
      className={cn(
        // Base styles
        cardVariants[variant],
        cardPadding[padding],
        // Hover effect
        hover && [
          'transition-all duration-300 ease-out',
          'hover:shadow-xl hover:shadow-slate-200/50',
          'hover:-translate-y-1',
          'hover:border-slate-300/60',
          'cursor-pointer',
        ].join(' '),
        // Inner glow effect (subtle)
        'relative overflow-hidden',
        className
      )}
      {...props}
    >
      {/* Subtle inner highlight */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
      <div className="relative">{children}</div>
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('mb-5', className)} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className,
  ...props
}) => (
  <h3 
    className={cn(
      'text-lg font-semibold tracking-tight text-slate-900',
      className
    )} 
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className,
  ...props
}) => (
  <p 
    className={cn(
      'text-sm text-slate-500 mt-1.5 leading-relaxed',
      className
    )} 
    {...props}
  >
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div className={cn('', className)} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className,
  ...props
}) => (
  <div 
    className={cn(
      'mt-6 pt-5 border-t border-slate-100/80',
      className
    )} 
    {...props}
  >
    {children}
  </div>
);

export default Card;
