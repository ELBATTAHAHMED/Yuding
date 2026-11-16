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

  return (
    <div className="travel-details-card travel-condition-list">
      <h3 className="travel-details-card__title text-lg font-bold mb-4">
        {title}
      </h3>

      <div className="travel-condition-list__grid grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleItems.map((item, idx) => {
          return (
            <div
              key={idx}
              className={`travel-condition-item travel-condition-item--${item.status || 'neutral'} rounded-lg p-4 flex items-start gap-3`}
            >
              <div className="travel-condition-item__icon text-lg mt-0.5 shrink-0">
                <i className={item.icon || 'fas fa-info-circle'} />
              </div>
              <div>
                <div className="travel-condition-item__title font-bold text-sm mb-1">
                  {item.title}
                </div>
                <div className="travel-condition-item__description text-xs leading-relaxed">
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
