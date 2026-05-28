/**
 * Enterprise Select Component
 * Consistent dropdown selection system
 */

import React, { forwardRef, useId } from 'react';
import { cn } from '../../design-system';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
  onChange?: (value: string) => void;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label, error, helperText, options, placeholder = 'Select an option', fullWidth = false, onChange, className, id, value, ...props
}, ref) => {
  const generatedId = useId();
  const selectId = id || `select-${generatedId}`;
  const hasEmptyOption = options.some((option) => option.value === '');

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && <label htmlFor={selectId} className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            'w-full px-3 py-2 pr-10 text-sm rounded-lg appearance-none',
            'bg-white dark:bg-slate-800 text-slate-900 dark:text-white',
            'border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-0',
            error
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500/50 focus:border-red-500'
              : 'border-slate-200 dark:border-slate-700 focus:ring-cyan-500/50 focus:border-cyan-500',
            fullWidth && 'w-full', !value && 'text-slate-400 dark:text-slate-500', className
          )}
          {...props}
        >
          {!hasEmptyOption && <option value="" disabled>{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {(error || helperText) && (
        <p className={cn('text-xs', error ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400')}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});
Select.displayName = 'Select';

export default Select;
