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
    <div
      style={{
        background: 'var(--card, #ffffff)',
        borderRadius: '12px',
        padding: '1.5rem',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
      }}
    >
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: 'var(--text, #0f172a)' }}>
        {title}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {visibleItems.map((item, idx) => {
          const colors = getStatusColors(item.status);
          return (
            <div
              key={idx}
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <div style={{ color: colors.iconColor, fontSize: '1.1rem', marginTop: '2px', flexShrink: 0 }}>
                <i className={item.icon || 'fas fa-info-circle'} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', marginBottom: '0.2rem' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.4 }}>
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
