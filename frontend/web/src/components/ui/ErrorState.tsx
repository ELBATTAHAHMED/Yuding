import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Une erreur est survenue',
  message,
  onRetry,
  retryLabel = 'Réessayer',
  className = '',
}) => {
  return (
    <div
      className={`text-center py-10 px-6 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#062523] shadow-sm max-w-lg mx-auto ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/20 mx-auto flex items-center justify-center text-lg mb-3.5">
        <i className="fas fa-exclamation-circle" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          icon={<i className="fas fa-redo-alt text-xs" />}
        >
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
