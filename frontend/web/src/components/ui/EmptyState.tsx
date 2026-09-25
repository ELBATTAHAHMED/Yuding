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
      className={`text-center py-12 px-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#062523] shadow-sm max-w-lg mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-teal-500/10 dark:bg-[#02E0D5]/10 text-[#01796F] dark:text-[#02E0D5] ring-1 ring-[#01796F]/20 dark:ring-[#02E0D5]/20 mx-auto flex items-center justify-center text-lg mb-3.5">
        <i className={`fas ${icon}`} />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 leading-relaxed max-w-sm mx-auto">
          {description}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
};
