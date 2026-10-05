'use client';

import React from 'react';

interface FilterOption {
  label: string;
  value: string;
}

interface FilterSelect {
  key: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

interface AdminFilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSelect[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
  totalCount?: number;
  filteredCount?: number;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function AdminFilterBar({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Rechercher par référence, UUID, client...',
  filters = [],
  onRefresh,
  isRefreshing = false,
  totalCount,
  filteredCount,
  onResetFilters,
  hasActiveFilters = false,
}: AdminFilterBarProps) {
  return (
    <div
      className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 mb-5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
    >
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[280px]">
        {/* Search input matching Reference Q Search */}
        <div className="relative flex-1 min-w-[220px]">
          <i
            className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-xs pl-9 pr-8 py-2.5 rounded-xl outline-none transition-all duration-150 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:border-slate-900 dark:focus:border-slate-400 focus:bg-white dark:focus:bg-slate-800"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              title="Effacer la recherche"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        {/* Dropdown Filters */}
        {filters.map((f) => (
          <div key={f.key} className="flex items-center gap-1.5">
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="text-xs px-3 py-2.5 rounded-xl outline-none cursor-pointer font-semibold transition-colors bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 focus:border-slate-900 dark:focus:border-slate-400"
            >
              {f.options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Clear Filters button */}
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold py-2 px-3 rounded-xl transition-colors bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/40 flex items-center gap-1.5"
          >
            <i className="fas fa-undo text-[10px]" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* Right controls: count badge and refresh */}
      <div className="flex items-center gap-3">
        {totalCount !== undefined && (
          <div
            className="text-xs admin-mono-tabular font-medium flex items-center gap-1.5 text-slate-500 dark:text-slate-400"
          >
            <span>Affichage :</span>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {filteredCount !== undefined ? filteredCount : totalCount}
            </span>
            {filteredCount !== undefined && filteredCount !== totalCount && (
              <span className="text-slate-400 dark:text-slate-500">/ {totalCount}</span>
            )}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-xs font-bold py-2 px-3.5 rounded-xl transition-all flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100 shadow-2xs disabled:opacity-50"
            title="Actualiser les données"
          >
            <i
              className={`fas fa-sync text-xs ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span>Actualiser</span>
          </button>
        )}
      </div>
    </div>
  );
}
