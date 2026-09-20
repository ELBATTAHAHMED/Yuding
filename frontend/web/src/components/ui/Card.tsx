import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'stat';
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  hoverable = false,
  className = '',
  ...props
}) => {
  const baseClasses =
    'rounded-xl transition-all duration-200 overflow-hidden bg-white dark:bg-[#1A1F2E] text-gray-900 dark:text-gray-100';

  const variantClasses: Record<string, string> = {
    default: 'border border-gray-100 dark:border-white/5 shadow-[0_4px_15px_rgba(0,0,0,0.06)]',
    elevated: 'shadow-[0_8px_25px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_25px_rgba(0,0,0,0.3)]',
    bordered: 'border border-gray-200 dark:border-white/10',
    stat: 'p-6 border border-gray-100 dark:border-white/5 shadow-sm',
  };

  const hoverClass = hoverable
    ? 'hover:-translate-y-1 hover:shadow-[0_10px_25px_rgba(0,0,0,0.12)] cursor-pointer'
    : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${hoverClass} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`text-lg font-bold text-gray-900 dark:text-white ${className}`} {...props}>
    {children}
  </h3>
);

export const CardBody: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-5 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex items-center justify-between ${className}`}
    {...props}
  >
    {children}
  </div>
);
