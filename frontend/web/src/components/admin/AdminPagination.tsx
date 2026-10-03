'use client';

import React from 'react';

interface AdminPaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newPageSize: number) => void;
  pageSizeOptions?: number[];
}

export function AdminPagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: AdminPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  return (
    <div
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t text-xs select-none"
      style={{
        borderColor: 'var(--admin-border)',
        backgroundColor: 'var(--admin-surface-muted)',
      }}
    >
      {/* Range Info & Page Size */}
      <div className="flex items-center gap-3">
        <span style={{ color: 'var(--admin-text-muted)' }}>
          Affichage de <strong style={{ color: 'var(--admin-text-primary)' }}>{startItem}</strong> à{' '}
          <strong style={{ color: 'var(--admin-text-primary)' }}>{endItem}</strong> sur{' '}
          <strong style={{ color: 'var(--admin-text-primary)' }}>{totalItems}</strong> entrées
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span style={{ color: 'var(--admin-text-muted)' }}>Par page :</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="admin-select text-xs py-1 px-2 rounded border"
              style={{
                borderColor: 'var(--admin-border)',
                backgroundColor: 'var(--admin-surface)',
                color: 'var(--admin-text-primary)',
              }}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page Navigation Buttons */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="admin-btn text-xs px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface)',
            color: 'var(--admin-text-secondary)',
          }}
          title="Première page"
        >
          <i className="fas fa-angle-double-left text-[0.7rem]" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="admin-btn text-xs px-2.5 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <i className="fas fa-chevron-left text-[0.65rem] mr-1" />
          <span>Précédent</span>
        </button>

        <span
          className="px-3 py-1 font-bold text-xs"
          style={{ color: 'var(--admin-text-primary)' }}
        >
          Page {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="admin-btn text-xs px-2.5 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface)',
            color: 'var(--admin-text-secondary)',
          }}
        >
          <span>Suivant</span>
          <i className="fas fa-chevron-right text-[0.65rem] ml-1" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="admin-btn text-xs px-2 py-1 rounded border disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            borderColor: 'var(--admin-border)',
            backgroundColor: 'var(--admin-surface)',
            color: 'var(--admin-text-secondary)',
          }}
          title="Dernière page"
        >
          <i className="fas fa-angle-double-right text-[0.7rem]" />
        </button>
      </div>
    </div>
  );
}
