/**
 * Enterprise Button Component
 * Consistent button system with multiple variants
 */

import React from 'react';
import { cn } from '../../design-system';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'solid' | 'outline' | 'ghost' | 'danger' | 'success';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-gradient-to-r from-amber-400 to-amber-500
    text-white
    hover:from-amber-500 hover:to-amber-600
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2
  `,
  secondary: `
    bg-gradient-to-r from-cyan-500 to-cyan-600
    text-white
    hover:from-cyan-600 hover:to-cyan-700
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2
  `,
  solid: `
    bg-slate-100 dark:bg-slate-700
    text-slate-700 dark:text-slate-200
    hover:bg-slate-200 dark:hover:bg-slate-600
    border border-slate-200 dark:border-slate-600
  `,
  outline: `
    bg-transparent
    text-slate-700 dark:text-slate-200
    border border-slate-300 dark:border-slate-600
    hover:bg-slate-50 dark:hover:bg-slate-800
  `,
  ghost: `
    bg-transparent
    text-slate-600 dark:text-slate-300
    hover:bg-slate-100 dark:hover:bg-slate-800
  `,
  danger: `
    bg-gradient-to-r from-red-500 to-red-600
    text-white
    hover:from-red-600 hover:to-red-700
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2
  `,
  success: `
    bg-gradient-to-r from-emerald-500 to-emerald-600
    text-white
    hover:from-emerald-600 hover:to-emerald-700
    shadow-sm hover:shadow-md
    focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-3 py-1.5 text-sm gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
};

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      type={type}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg',
        'transition-all duration-150 active:scale-95',
        'focus:outline-none',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon: React.ReactNode;
  label: string;
  loading?: boolean;
}

const iconSizeClasses: Record<ButtonSize, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
};

export function IconButton({ variant = 'ghost', size = 'md', icon, label, loading, className }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(
        'inline-flex items-center justify-center rounded-lg',
        'transition-all duration-150 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        iconSizeClasses[size],
        className
      )}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    </button>
  );
}

export default Button;