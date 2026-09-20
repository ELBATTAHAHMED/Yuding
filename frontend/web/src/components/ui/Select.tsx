import React, { forwardRef } from 'react';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      error,
      helperText,
      fullWidth = true,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-3`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            disabled={disabled}
            className={`w-full rounded-md border text-sm transition-colors duration-200
              py-2.5 px-3.5 pr-8 appearance-none
              bg-white dark:bg-[#1A2525]
              text-gray-900 dark:text-gray-100
              disabled:opacity-60 disabled:cursor-not-allowed
              ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-400/30'
                  : 'border-gray-300 dark:border-gray-700 focus:border-[#01796F] focus:ring-2 focus:ring-[#02E0D5]/40'
              }
              focus:outline-none ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center px-2.5 pointer-events-none text-gray-500 dark:text-gray-400">
            <i className="fas fa-chevron-down text-xs" />
          </div>
        </div>
        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
            <i className="fas fa-exclamation-circle text-xs" />
            <span>{error}</span>
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
