/**
 * Status Badge Component
 * Enterprise status indicator with semantic colors
 */

import React from 'react';
import { clsx } from 'clsx';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
export type StatusSize = 'sm' | 'md' | 'lg';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: StatusSize;
  pulse?: boolean;
  className?: string;
}

const variantClasses: Record<StatusVariant, string> = {
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
  error: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30',
  info: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
};

const sizeClasses: Record<StatusSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

const dotSizes: Record<StatusSize, string> = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
  lg: 'w-2.5 h-2.5',
};

// Get variant from status string
function getVariantFromStatus(status: string): StatusVariant {
  const statusLower = status.toLowerCase();

  if (['active', 'healthy', 'completed', 'resolved', 'verified', 'success', 'ok'].includes(statusLower)) {
    return 'success';
  }
  if (['pending', 'processing', 'investigating', 'running', 'degraded'].includes(statusLower)) {
    return 'warning';
  }
  if (['failed', 'error', 'critical', 'down', 'blocked', 'rejected'].includes(statusLower)) {
    return 'error';
  }
  if (['new', 'info', 'info_only'].includes(statusLower)) {
    return 'info';
  }
  return 'neutral';
}

// Get pulse animation for active statuses
function shouldPulse(status: string): boolean {
  const pulsing = ['active', 'running', 'processing', 'investigating', 'degraded'];
  return pulsing.includes(status.toLowerCase());
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  size = 'md',
  pulse,
  className,
}) => {
  const resolvedVariant = variant || getVariantFromStatus(status);
  const shouldPulseAnimation = pulse !== undefined ? pulse : shouldPulse(status);

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 font-medium rounded-full border',
        variantClasses[resolvedVariant],
        sizeClasses[size],
        className
      )}
    >
      <span
        className={clsx(
          'rounded-full',
          dotSizes[size],
          resolvedVariant === 'success' && 'bg-emerald-500',
          resolvedVariant === 'warning' && 'bg-amber-500',
          resolvedVariant === 'error' && 'bg-red-500',
          resolvedVariant === 'info' && 'bg-sky-500',
          resolvedVariant === 'neutral' && 'bg-slate-500',
          shouldPulseAnimation && 'animate-pulse'
        )}
      />
      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
    </span>
  );
};

// Severity badge with gradient
interface SeverityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  size?: StatusSize;
  className?: string;
}

const severityVariants: Record<string, { bg: string; text: string; border: string }> = {
  critical: {
    bg: 'bg-gradient-to-r from-red-600 to-red-700',
    text: 'text-white',
    border: 'border-red-800',
  },
  high: {
    bg: 'bg-gradient-to-r from-amber-500 to-orange-500',
    text: 'text-white',
    border: 'border-amber-700',
  },
  medium: {
    bg: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
    text: 'text-slate-900',
    border: 'border-yellow-600',
  },
  low: {
    bg: 'bg-gradient-to-r from-green-400 to-green-500',
    text: 'text-white',
    border: 'border-green-600',
  },
  info: {
    bg: 'bg-gradient-to-r from-sky-400 to-sky-500',
    text: 'text-white',
    border: 'border-sky-600',
  },
};

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  className,
}) => {
  const styles = severityVariants[severity];

  return (
    <span
      className={clsx(
        'inline-flex items-center font-semibold rounded border shadow-sm',
        styles.bg,
        styles.text,
        styles.border,
        sizeClasses[size],
        className
      )}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
};

export default StatusBadge;