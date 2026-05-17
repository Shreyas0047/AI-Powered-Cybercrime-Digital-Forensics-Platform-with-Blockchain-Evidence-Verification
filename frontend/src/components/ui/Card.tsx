/**
 * Enterprise Card Component
 * Standardized card wrapper with consistent styling
 */

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../design-system';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'ghost' | 'accent';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
}: CardProps) {
  const variantClasses = {
    default: 'bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 shadow-sm',
    elevated: 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md',
    bordered: 'bg-white dark:bg-slate-800/80 border-2 border-slate-300 dark:border-slate-600',
    ghost: 'bg-transparent border border-transparent',
    accent: 'bg-white dark:bg-slate-800/80 border border-cyan-200 dark:border-cyan-700/50 shadow-sm',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      whileHover={hover ? { y: -2 } : undefined}
      className={cn(
        'rounded-xl',
        variantClasses[variant],
        paddingClasses[padding],
        hover && 'cursor-pointer transition-shadow hover:shadow-md',
        className
      )}
    >
      {children}
    </motion.div>
  );
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function CardHeader({ title, description, action, className, children }: CardHeaderProps) {
  if (children) {
    return (
      <div className={cn('px-5 py-4 border-b border-slate-100 dark:border-slate-700/50', className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn('flex items-start justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-700/50', className)}>
      <div>
        {title && (
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h3>
        )}
        {description && (
          <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-5', className)}>
      {children}
    </div>
  );
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-5 py-4 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-xl', className)}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Content = CardContent;
Card.Footer = CardFooter;

export default Card;