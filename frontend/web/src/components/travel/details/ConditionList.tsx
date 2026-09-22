import React from 'react';

export interface ConditionItem {
  icon?: string;
  title: string;
  description?: string | null;
  status?: 'success' | 'warning' | 'neutral' | 'error';
}

export interface ConditionListProps {
  title?: string;
  items: ConditionItem[];
}

export const ConditionList: React.FC<ConditionListProps> = ({
  title = 'Conditions & Informations Importantes',
  items = [],
}) => {
  const visibleItems = items.filter((item) => item.description != null && item.description.trim() !== '');

  if (visibleItems.length === 0) return null;

  const getStatusColors = (status?: ConditionItem['status']) => {
    switch (status) {
      case 'success':
        return { iconColor: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' };
      case 'warning':
        return { iconColor: '#d97706', bg: '#fffbeb', border: '#fde68a' };
      case 'error':
        return { iconColor: '#dc2626', bg: '#fef2f2', border: '#fecaca' };
      default:
        return { iconColor: '#01796F', bg: '#f8fafc', border: '#e2e8f0' };
    }
  };

  return (
    <div className="bg-white dark:bg-[#062523] rounded-xl p-6 border border-slate-200 dark:border-white/10 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
        {title}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map((item, idx) => {
          return (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-[#021817] border border-slate-200 dark:border-white/10 rounded-lg p-4 flex items-start gap-3"
            >
              <div className="text-[#01796F] dark:text-[#02E0D5] text-lg mt-0.5 shrink-0">
                <i className={item.icon || 'fas fa-info-circle'} />
              </div>
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  {item.title}
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
