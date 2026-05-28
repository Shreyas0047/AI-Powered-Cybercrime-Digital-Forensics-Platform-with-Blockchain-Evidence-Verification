/**
 * Enterprise Input Component
 * Consistent form input system
 */

import { forwardRef, useId } from 'react';
import { cn } from '../../design-system';
import { AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label, error, helperText, leftIcon, rightIcon, fullWidth = false, className, id, ...props
}, ref) => {
  const generatedId = useId();
  const inputId = id || `input-${generatedId}`;

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</div>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 text-sm rounded-lg',
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
            'placeholder:text-slate-400 dark:placeholder:text-slate-500',
            'border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500/50 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500',
            leftIcon && 'pl-10', rightIcon && 'pr-10', fullWidth && 'w-full', className
          )}
          {...props}
        />
        {error && !rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500">
            <AlertCircle className="w-4 h-4" />
          </div>
        )}
      </div>
      {(error || helperText) && (
        <p className={cn('text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});
Input.displayName = 'Input';

// Textarea
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label, error, helperText, fullWidth = false, className, id, ...props
}, ref) => {
  const generatedId = useId();
  const textareaId = id || `textarea-${generatedId}`;

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && <label htmlFor={textareaId} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          'w-full px-3 py-2 text-sm rounded-lg resize-y min-h-[80px]',
          'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
          error ? 'border-red-300 dark:border-red-700 focus:ring-red-500/50 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500',
          fullWidth && 'w-full', className
        )}
        {...props}
      />
      {(error || helperText) && (
        <p className={cn('text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});
Textarea.displayName = 'Textarea';

export default Input;
