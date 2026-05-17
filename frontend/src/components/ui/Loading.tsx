import type { HTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

interface LoadingProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Loading({ className, size = 'md', ...props }: LoadingProps) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)} {...props}>
      <svg className={cn('animate-spin text-cyan-600', sizes[size])} fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </div>
  );
}

export function PageLoading({ className }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col items-center justify-center min-h-[400px] space-y-4', className)}>
      <Loading size="lg" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  );
}

export default Loading;