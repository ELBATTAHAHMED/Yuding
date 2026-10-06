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
  searchPlaceholder = 'Rechercher par référence, client...',
  filters = [],
  onRefresh,
  isRefreshing = false,
  totalCount,
  filteredCount,
  onResetFilters,
  hasActiveFilters = false,
}: AdminFilterBarProps) {
  return (
    <div className="bg-white dark:bg-[#14171E] border border-[#E2E8F0] dark:border-[#1E2430] rounded-xl p-3 mb-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
      <div className="flex flex-1 flex-wrap items-center gap-3 min-w-[260px]">
        {/* Compact search input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-xs pl-8 pr-7 py-2 rounded-lg outline-none transition-colors bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] text-[#0F172A] dark:text-white placeholder:text-[#94A3B8] focus:border-[#0F172A] dark:focus:border-white"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white"
              title="Effacer"
            >
              <i className="fas fa-times" />
            </button>
          )}
        </div>

        {/* Dropdown filters */}
        {filters.map((f) => (
          <div key={f.key} className="flex items-center">
            <select
              value={f.value}
              onChange={(e) => f.onChange(e.target.value)}
              className="text-xs px-3 py-2 rounded-lg outline-none cursor-pointer font-semibold transition-colors bg-[#F8F9FA] dark:bg-[#1A1F28] border border-[#E2E8F0] dark:border-[#2D3748] text-[#0F172A] dark:text-white focus:border-[#0F172A] dark:focus:border-white"
            >
              {f.options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white dark:bg-[#14171E] text-[#0F172A] dark:text-white"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {/* Reset filters */}
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="text-xs font-semibold py-2 px-3 rounded-lg transition-colors bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200/70 dark:border-rose-900/40 flex items-center gap-1.5"
          >
            <i className="fas fa-undo text-[10px]" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* Right counts and refresh */}
      <div className="flex items-center gap-3">
        {totalCount !== undefined && (
          <div className="text-xs admin-mono-tabular font-medium text-[#64748B] dark:text-[#94A3B8]">
            <span className="font-bold text-[#0F172A] dark:text-white">
              {filteredCount !== undefined ? filteredCount : totalCount}
            </span>
            {filteredCount !== undefined && filteredCount !== totalCount && (
              <span className="text-[#94A3B8]"> sur {totalCount}</span>
            )}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="admin-btn bg-[#0F172A] hover:bg-slate-800 text-white dark:bg-[#1E2430] dark:hover:bg-[#2B3342] dark:text-white"
            title="Actualiser"
          >
            <i className={`fas fa-sync text-xs ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Actualiser</span>
          </button>
        )}
      </div>
    </div>
  );
}
