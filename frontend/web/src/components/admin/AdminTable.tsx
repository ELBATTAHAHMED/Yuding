'use client';

import React from 'react';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
  emptySubtext?: string;
  emptyIcon?: string;
  onRowClick?: (item: T) => void;
  className?: string;
  footer?: React.ReactNode;
}

export function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Aucune donnée disponible',
  emptySubtext = 'Aucun élément ne correspond aux filtres appliqués',
  emptyIcon = 'fas fa-inbox',
  onRowClick,
  className = '',
  footer,
}: AdminTableProps<T>) {
  return (
    <div
      className={`admin-card overflow-hidden ${className}`}
    >
      <div className="overflow-x-auto admin-custom-scrollbar">
        <table className="admin-table w-full">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={{
                    width: col.width,
                    textAlign: col.align || 'left',
                  }}
                  className={col.className || ''}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`}>
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`}>
                      <div className="h-4 rounded bg-[#E2E8F0] dark:bg-[#1E2430] animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm"
                      style={{
                        backgroundColor: 'var(--admin-surface-muted)',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      <i className={emptyIcon} />
                    </div>
                    <div
                      className="font-bold text-xs"
                      style={{ color: 'var(--admin-text-primary)' }}
                    >
                      {emptyMessage}
                    </div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--admin-text-muted)' }}
                    >
                      {emptySubtext}
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item) => {
                const key = keyExtractor(item);
                const isClickable = Boolean(onRowClick);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick?.(item)}
                    className={isClickable ? 'cursor-pointer select-none' : ''}
                  >
                    {columns.map((col) => {
                      const value = (item as any)[col.key];
                      return (
                        <td
                          key={`${key}-${col.key}`}
                          style={{
                            textAlign: col.align || 'left',
                          }}
                          className={col.className}
                        >
                          {col.render ? col.render(item) : value ?? '—'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {footer && <div className="border-t border-[var(--admin-border)]">{footer}</div>}
    </div>
  );
}
