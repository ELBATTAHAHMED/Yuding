import React from 'react';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'fa-search',
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`text-center py-16 px-4 rounded-xl border border-dashed border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] max-w-md mx-auto ${className}`}
    >
      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 mx-auto flex items-center justify-center text-2xl mb-4">
        <i className={`fas ${icon}`} />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};
