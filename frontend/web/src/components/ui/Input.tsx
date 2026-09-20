import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      iconRight,
      fullWidth = true,
      id,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={`${fullWidth ? 'w-full' : ''} mb-3`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`w-full rounded-md border text-sm transition-colors duration-200
              py-2.5 px-3.5
              ${icon ? 'pl-10' : ''}
              ${iconRight ? 'pr-10' : ''}
              bg-white dark:bg-[#1A2525]
              text-gray-900 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              disabled:opacity-60 disabled:cursor-not-allowed
              ${
                error
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-400/30'
                  : 'border-gray-300 dark:border-gray-700 focus:border-[#01796F] focus:ring-2 focus:ring-[#02E0D5]/40'
              }
              focus:outline-none ${className}`}
            {...props}
          />
          {iconRight && (
            <div className="absolute right-3 text-gray-400 dark:text-gray-500 pointer-events-none flex items-center">
              {iconRight}
            </div>
          )}
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

Input.displayName = 'Input';
