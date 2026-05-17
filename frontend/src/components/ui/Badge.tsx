/**
 * Enterprise Badge Component
 * Consistent status and severity indicators
 */

import { motion } from 'framer-motion';
import { cn } from '../../design-system';

// ============================================
// Status Badge
// ============================================
type StatusValue = 'active' | 'pending' | 'analyzing' | 'resolved' | 'in_progress' | 'new' | 'acknowledged' | 'closed' | 'archived';

interface StatusBadgeProps {
  status: StatusValue | string;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  active: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  resolved: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', dot: 'bg-emerald-500' },
  acknowledged: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  in_progress: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  analyzing: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', dot: 'bg-amber-500' },
  pending: { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  new: { bg: 'bg-sky-50 dark:bg-sky-950/30', text: 'text-sky-700 dark:text-sky-400', dot: 'bg-sky-500' },
  closed: { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
  archived: { bg: 'bg-slate-100 dark:bg-slate-700/50', text: 'text-slate-600 dark:text-slate-400', dot: 'bg-slate-400' },
};

const sizeConfig = { sm: 'px-1.5 py-0.5 text-[10px]', md: 'px-2 py-1 text-xs', lg: 'px-2.5 py-1 text-sm' };
const dotSizeConfig = { sm: 'w-1.5 h-1.5', md: 'w-2 h-2', lg: 'w-2.5 h-2.5' };

const pulsingStatuses = ['active', 'analyzing', 'in_progress', 'acknowledged', 'new'];

export function StatusBadge({ status, size = 'md', showDot = true, pulse, className }: StatusBadgeProps) {
  const config = statusConfig[status.toLowerCase()] || statusConfig.pending;
  const shouldPulse = pulse !== undefined ? pulse : pulsingStatuses.includes(status.toLowerCase());

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('inline-flex items-center gap-1.5 font-medium rounded-full border', config.bg, config.text, sizeConfig[size], className)}
    >
      {showDot && <span className={cn('rounded-full flex-shrink-0', config.dot, dotSizeConfig[size], shouldPulse && 'animate-pulse')} />}
      <span className="capitalize">{status.replace(/_/g, ' ')}</span>
    </motion.span>
  );
}

// ============================================
// Severity Badge
// ============================================
type SeverityValue = 'critical' | 'high' | 'medium' | 'low' | 'info';

interface SeverityBadgeProps {
  severity: SeverityValue;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const severityConfig: Record<SeverityValue, { bg: string; text: string; border: string }> = {
  critical: { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600' },
  high: { bg: 'bg-orange-500', text: 'text-white', border: 'border-orange-600' },
  medium: { bg: 'bg-yellow-500', text: 'text-slate-900', border: 'border-yellow-600' },
  low: { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600' },
  info: { bg: 'bg-sky-500', text: 'text-white', border: 'border-sky-600' },
};

export function SeverityBadge({ severity, size = 'md', showIcon = false, className }: SeverityBadgeProps) {
  const config = severityConfig[severity];
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('inline-flex items-center justify-center font-semibold rounded border shadow-sm', config.bg, config.text, config.border, sizeConfig[size], className)}
    >
      {showIcon && <span className="mr-1">{severity === 'critical' ? '!' : severity === 'high' ? '↑' : '●'}</span>}
      <span>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
    </motion.span>
  );
}

// ============================================
// Count Badge
// ============================================
interface CountBadgeProps {
  count: number;
  max?: number;
  variant?: 'default' | 'primary' | 'danger';
  className?: string;
}

export function CountBadge({ count, max = 99, variant = 'default', className }: CountBadgeProps) {
  const variantClasses = {
    default: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
    primary: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  if (count === 0) return null;
  const displayCount = count > max ? `${max}+` : count;

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold rounded-full', variantClasses[variant], className)}
    >
      {displayCount}
    </motion.span>
  );
}

export default StatusBadge;