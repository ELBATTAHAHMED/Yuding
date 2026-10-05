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
  maxHeight?: string;
  footer?: React.ReactNode;
}

export function AdminTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Aucune donnée trouvée',
  emptySubtext = 'Aucun élément ne correspond aux filtres actuels',
  emptyIcon = 'fas fa-inbox',
  onRowClick,
  className = '',
  maxHeight,
  footer,
}: AdminTableProps<T>) {
  return (
    <div
      className={`w-full overflow-hidden ${className}`}
    >
      <div
        className="overflow-x-auto admin-custom-scrollbar"
        style={{ maxHeight: maxHeight || undefined }}
      >
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
                  className={`text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 py-2.5 px-3 border-b border-slate-100 dark:border-zinc-800/ bg-transparent ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // 5 skeleton rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`}>
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-cell-${cIdx}`}>
                      <div className="h-4 rounded bg-slate-200 dark:bg-zinc-800 animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
                      style={{
                        backgroundColor: 'var(--admin-surface-muted)',
                        color: 'var(--admin-text-muted)',
                      }}
                    >
                      <i className={emptyIcon} />
                    </div>
                    <div
                      className="font-semibold text-sm"
                      style={{ color: 'var(--admin-text-primary)' }}
                    >
                      {emptyMessage}
                    </div>
                    <div
                      className="text-xs"
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
      {footer && <div className="border-t border-inherit">{footer}</div>}
    </div>
  );
}
