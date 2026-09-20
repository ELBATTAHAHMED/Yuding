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
      className={`text-center py-12 px-4 rounded-xl border border-red-100 dark:border-red-950/50 bg-red-50/50 dark:bg-red-950/20 max-w-lg mx-auto ${className}`}
    >
      <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center text-2xl mb-4">
        <i className="fas fa-exclamation-triangle" />
      </div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">{message}</p>
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
