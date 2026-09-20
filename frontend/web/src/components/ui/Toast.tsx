import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  type?: ToastType;
  message: string;
  title?: string;
  onClose?: () => void;
  className?: string;
}

export const Toast: React.FC<ToastProps> = ({
  type = 'info',
  message,
  title,
  onClose,
  className = '',
}) => {
  const typeConfig: Record<
    ToastType,
    { bg: string; border: string; text: string; icon: string; iconColor: string }
  > = {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: 'fa-check-circle',
      iconColor: 'text-emerald-500 dark:text-emerald-400',
    },
    error: {
      bg: 'bg-red-50 dark:bg-red-950/40',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-200',
      icon: 'fa-exclamation-circle',
      iconColor: 'text-red-500 dark:text-red-400',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-900 dark:text-amber-200',
      icon: 'fa-triangle-exclamation',
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
    info: {
      bg: 'bg-teal-50 dark:bg-teal-950/40',
      border: 'border-teal-200 dark:border-teal-800',
      text: 'text-teal-900 dark:text-teal-200',
      icon: 'fa-circle-info',
      iconColor: 'text-teal-500 dark:text-teal-400',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      role="alert"
      className={`p-4 rounded-lg border flex items-start gap-3 shadow-sm ${config.bg} ${config.border} ${config.text} ${className}`}
    >
      <i className={`fas ${config.icon} ${config.iconColor} text-lg shrink-0 mt-0.5`} />
      <div className="flex-1 text-sm">
        {title && <h5 className="font-bold mb-0.5">{title}</h5>}
        <p className="leading-relaxed">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-current opacity-60 hover:opacity-100 p-0.5 transition-opacity"
          aria-label="Fermer la notification"
          type="button"
        >
          <i className="fas fa-times text-xs" />
        </button>
      )}
    </div>
  );
};
