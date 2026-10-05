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
      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3.5 border-t text-xs select-none bg-slate-50/60 dark:bg-zinc-900/ border-slate-100 dark:border-zinc-800/"
    >
      {/* Range Info & Page Size */}
      <div className="flex items-center gap-3">
        <span className="text-slate-500 dark:text-zinc-400">
          Affichage de <strong className="text-slate-900 dark:text-zinc-100 admin-mono-tabular">{startItem}</strong> à{' '}
          <strong className="text-slate-900 dark:text-zinc-100 admin-mono-tabular">{endItem}</strong> sur{' '}
          <strong className="text-slate-900 dark:text-zinc-100 admin-mono-tabular">{totalItems}</strong> entrées
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400 dark:text-zinc-500">Par page :</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="text-xs py-1 px-2.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 outline-none"
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
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          title="Première page"
        >
          <i className="fas fa-angle-double-left text-[10px]" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
        >
          <i className="fas fa-chevron-left text-[9px]" />
          <span>Précédent</span>
        </button>

        <span
          className="px-3 py-1 font-bold text-xs text-slate-900 dark:text-zinc-100 admin-mono-tabular"
        >
          Page {currentPage} / {totalPages}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
        >
          <span>Suivant</span>
          <i className="fas fa-chevron-right text-[9px]" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages}
          className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors"
          title="Dernière page"
        >
          <i className="fas fa-angle-double-right text-[10px]" />
        </button>
      </div>
    </div>
  );
}
