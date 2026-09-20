import React, { forwardRef } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconRight?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      icon,
      iconRight,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseClasses =
      'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#02E0D5] disabled:opacity-60 disabled:cursor-not-allowed disabled:pointer-events-none cursor-pointer select-none';

    // Variant mapping
    const variantClasses: Record<ButtonVariant, string> = {
      primary:
        'bg-[#01796F] hover:bg-[#005951] text-white shadow-sm hover:shadow active:scale-[0.99]',
      secondary:
        'bg-[#02E0D5] hover:bg-[#00c5bc] text-[#001B1A] font-bold shadow-sm hover:shadow active:scale-[0.99]',
      outline:
        'border border-[#01796F] text-[#01796F] hover:bg-[#01796F]/10 dark:text-[#02E0D5] dark:border-[#02E0D5] dark:hover:bg-[#02E0D5]/10 bg-transparent',
      ghost:
        'bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-current',
      danger:
        'bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow active:scale-[0.99]',
    };

    // Size mapping
    const sizeClasses: Record<ButtonSize, string> = {
      sm: 'text-xs px-3 py-1.5 gap-1.5',
      md: 'text-sm px-4 py-2.5 gap-2',
      lg: 'text-base px-6 py-3 gap-2.5',
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <i className="fas fa-spinner fa-spin" aria-hidden="true" />
        ) : (
          icon && <span className="inline-flex shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!isLoading && iconRight && <span className="inline-flex shrink-0">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
