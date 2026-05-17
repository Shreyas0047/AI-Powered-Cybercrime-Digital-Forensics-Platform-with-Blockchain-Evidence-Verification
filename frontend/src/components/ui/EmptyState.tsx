import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../utils/helpers';
import { FileX } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)} {...props}>
      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
        {icon || <FileX className="w-8 h-8 text-slate-400" />}
      </div>
      <h3 className="text-lg font-medium text-slate-700 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 text-center max-w-sm mb-4">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;