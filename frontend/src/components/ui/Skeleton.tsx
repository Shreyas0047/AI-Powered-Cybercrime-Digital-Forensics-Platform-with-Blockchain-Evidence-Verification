/**
 * Premium Skeleton Loaders
 * Animated loading placeholders with shimmer effect
 */

import { motion } from 'framer-motion';
import { useTheme } from '../../providers/ThemeProvider';
import { cn } from '../../design-system';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'shimmer' | 'pulse' | 'none';
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  animation = 'shimmer',
}: SkeletonProps) {
  const { isDark } = useTheme();

  const variantStyles = {
    text: { borderRadius: '4px', height: height || '1em' },
    circular: { borderRadius: '50%' },
    rectangular: { borderRadius: '0px' },
    rounded: { borderRadius: '8px' },
  };

  const animationStyles = {
    shimmer: {
      background: `linear-gradient(90deg, ${isDark ? '#1e293b' : '#f1f5f9'} 25%, ${isDark ? '#334155' : '#e2e8f0'} 50%, ${isDark ? '#1e293b' : '#f1f5f9'} 75%)`,
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
    },
    pulse: {
      animation: 'pulse 2s ease-in-out infinite',
    },
    none: {},
  };

  return (
    <div
      className={cn('bg-slate-200 dark:bg-slate-700', className)}
      style={{
        width: width || '100%',
        height: height || '20px',
        ...variantStyles[variant],
        ...animationStyles[animation],
      }}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border p-5 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={16} className="mb-2" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="rounded" height={80} className="mb-4" />
      <div className="space-y-2">
        <Skeleton variant="text" width="100%" height={14} />
        <Skeleton variant="text" width="80%" height={14} />
        <Skeleton variant="text" width="90%" height={14} />
      </div>
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-xl border overflow-hidden bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4">
        <div className="flex gap-4">
          <Skeleton variant="text" width="15%" height={16} />
          <Skeleton variant="text" width="25%" height={16} />
          <Skeleton variant="text" width="20%" height={16} />
          <Skeleton variant="text" width="15%" height={16} />
          <Skeleton variant="text" width="25%" height={16} />
        </div>
      </div>
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton variant="text" width="15%" height={20} />
            <Skeleton variant="text" width="25%" height={20} />
            <Skeleton variant="text" width="20%" height={20} />
            <Skeleton variant="text" width="15%" height={20} />
            <Skeleton variant="text" width="25%" height={20} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border p-5 bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50">
      <div className="flex items-start justify-between mb-4">
        <Skeleton variant="circular" width={48} height={48} />
        <Skeleton variant="rounded" width={60} height={20} />
      </div>
      <Skeleton variant="text" width="40%" height={36} className="mb-2" />
      <Skeleton variant="text" width="60%" height={14} />
    </div>
  );
}

export function ListSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50"
        >
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="70%" height={14} className="mb-2" />
            <Skeleton variant="text" width="50%" height={12} />
          </div>
          <Skeleton variant="rounded" width={60} height={24} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;