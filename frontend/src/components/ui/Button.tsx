import React from 'react';
import { cn } from '../../lib/utils';

/**
 * 🎨 Premium Button Component
 * 
 * Features:
 * - Gradient backgrounds với colored shadows
 * - Micro-interactions (hover lift, press effect)
 * - Smooth transitions
 * - Multiple variants & sizes
 */

// Button variants với gradient và colored shadows
const variantStyles = {
  primary: [
    'bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600',
    'text-white font-semibold',
    'shadow-lg shadow-blue-500/30',
    'hover:shadow-xl hover:shadow-blue-500/40',
    'hover:from-blue-500 hover:via-blue-400 hover:to-blue-500',
    'active:shadow-md',
    'border border-blue-500/20',
  ].join(' '),
  
  secondary: [
    'bg-gradient-to-r from-slate-100 to-slate-50',
    'text-slate-700 font-medium',
    'shadow-sm shadow-slate-200/50',
    'hover:shadow-md hover:shadow-slate-300/50',
    'hover:from-slate-50 hover:to-white',
    'border border-slate-200/60',
  ].join(' '),
  
  success: [
    'bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600',
    'text-white font-semibold',
    'shadow-lg shadow-emerald-500/30',
    'hover:shadow-xl hover:shadow-emerald-500/40',
    'hover:from-emerald-500 hover:via-emerald-400 hover:to-emerald-500',
    'border border-emerald-500/20',
  ].join(' '),
  
  danger: [
    'bg-gradient-to-r from-red-600 via-red-500 to-red-600',
    'text-white font-semibold',
    'shadow-lg shadow-red-500/30',
    'hover:shadow-xl hover:shadow-red-500/40',
    'hover:from-red-500 hover:via-red-400 hover:to-red-500',
    'border border-red-500/20',
  ].join(' '),
  
  warning: [
    'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500',
    'text-white font-semibold',
    'shadow-lg shadow-amber-500/30',
    'hover:shadow-xl hover:shadow-amber-500/40',
    'hover:from-amber-400 hover:via-amber-300 hover:to-amber-400',
    'border border-amber-400/20',
  ].join(' '),
  
  ghost: [
    'bg-transparent',
    'text-slate-600 font-medium',
    'hover:bg-slate-100/80 hover:text-slate-900',
    'active:bg-slate-200/60',
  ].join(' '),
  
  outline: [
    'bg-white/80 backdrop-blur-sm',
    'text-slate-700 font-medium',
    'border-2 border-slate-200',
    'hover:border-blue-400 hover:text-blue-600',
    'hover:shadow-md hover:shadow-blue-500/10',
    'active:border-blue-500',
  ].join(' '),

  glass: [
    'bg-white/70 backdrop-blur-md',
    'text-slate-700 font-medium',
    'border border-white/40',
    'shadow-lg shadow-slate-200/20',
    'hover:bg-white/90 hover:shadow-xl',
  ].join(' '),
};

const sizeStyles = {
  xs: 'text-xs px-2.5 py-1 rounded-lg gap-1',
  sm: 'text-sm px-3.5 py-1.5 rounded-xl gap-1.5',
  md: 'text-sm px-5 py-2.5 rounded-xl gap-2',
  lg: 'text-base px-6 py-3 rounded-2xl gap-2',
  xl: 'text-lg px-8 py-4 rounded-2xl gap-2.5',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantStyles;
  size?: keyof typeof sizeStyles;
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          'inline-flex items-center justify-center',
          'font-medium tracking-wide',
          // 🎨 Smooth transitions for all properties
          'transition-all duration-300 ease-out',
          // 🎨 Micro-interactions
          'hover:-translate-y-0.5',
          'active:scale-[0.98] active:translate-y-0',
          // Focus ring
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50',
          // Disabled state
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100',
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          // Full width
          fullWidth && 'w-full',
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
