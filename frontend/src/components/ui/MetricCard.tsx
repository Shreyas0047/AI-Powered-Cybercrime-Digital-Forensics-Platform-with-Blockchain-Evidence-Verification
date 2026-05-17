/**
 * Metric Card Component
 * Enterprise dashboard metric display
 */

import { clsx } from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
  onClick?: () => void;
}

const variantStyles: Record<string, { bg: string; icon: string; border: string }> = {
  default: {
    bg: 'bg-white dark:bg-slate-800/50',
    icon: 'bg-slate-100 dark:bg-slate-700',
    border: 'border-slate-200 dark:border-slate-700',
  },
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    icon: 'bg-emerald-100 dark:bg-emerald-800/50',
    border: 'border-emerald-200 dark:border-emerald-700/50',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    icon: 'bg-amber-100 dark:bg-amber-800/50',
    border: 'border-amber-200 dark:border-amber-700/50',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'bg-red-100 dark:bg-red-800/50',
    border: 'border-red-200 dark:border-red-700/50',
  },
  info: {
    bg: 'bg-sky-50 dark:bg-sky-900/20',
    icon: 'bg-sky-100 dark:bg-sky-800/50',
    border: 'border-sky-200 dark:border-sky-700/50',
  },
};

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
  onClick,
}) => {
  const styles = variantStyles[variant];

  return (
    <div
      className={clsx(
        'rounded-xl border p-4 transition-all duration-200',
        styles.bg,
        styles.border,
        onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white truncate">
            {value}
          </p>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate">
              {subtitle}
            </p>
          )}
          {trend && (
            <div className="mt-2 flex items-center gap-1">
              {trend.direction === 'up' && (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              )}
              {trend.direction === 'down' && (
                <TrendingDown className="w-3.5 h-3.5 text-red-500" />
              )}
              {trend.direction === 'neutral' && (
                <Minus className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span
                className={clsx(
                  'text-xs font-medium',
                  trend.direction === 'up' && 'text-emerald-600 dark:text-emerald-400',
                  trend.direction === 'down' && 'text-red-600 dark:text-red-400',
                  trend.direction === 'neutral' && 'text-slate-500 dark:text-slate-400'
                )}
              >
                {trend.value > 0 ? '+' : ''}
                {trend.value}%
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                vs last period
              </span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className={clsx(
              'flex-shrink-0 rounded-lg p-2.5',
              styles.icon
            )}
          >
            <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
        )}
      </div>
    </div>
  );
};

// Compact metric for grids
interface CompactMetricProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  className?: string;
}

export const CompactMetric: React.FC<CompactMetricProps> = ({
  label,
  value,
  icon: Icon,
  className,
}) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 p-2',
        className
      )}
    >
      {Icon && (
        <Icon className="w-4 h-4 text-slate-400 dark:text-slate-500" />
      )}
      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
        {label}
      </span>
      <span className="ml-auto text-sm font-semibold text-slate-900 dark:text-white">
        {value}
      </span>
    </div>
  );
};

export default MetricCard;