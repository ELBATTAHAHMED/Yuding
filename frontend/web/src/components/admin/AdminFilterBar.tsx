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
      className="admin-card p-3 mb-4 flex flex-wrap items-center justify-between gap-3"
      style={{
        background: 'var(--admin-surface)',
        borderColor: 'var(--admin-border)',
      }}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2.5 min-w-[280px]">
        {/* Search input with leading icon */}
        <div className="relative flex-1 min-w-[220px]">
          <i
            className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: 'var(--admin-text-muted)' }}
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full text-xs pl-8 pr-7 py-2 rounded-md outline-none transition-all duration-150"
            style={{
              backgroundColor: 'var(--admin-surface-muted)',
              border: '1px solid var(--admin-border)',
              color: 'var(--admin-text-primary)',
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs hover:opacity-100 opacity-60"
              style={{ color: 'var(--admin-text-muted)' }}
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
              className="text-xs px-2.5 py-2 rounded-md outline-none cursor-pointer font-medium transition-colors"
              style={{
                backgroundColor: 'var(--admin-surface-muted)',
                border: '1px solid var(--admin-border)',
                color: 'var(--admin-text-primary)',
              }}
            >
              {f.options.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  style={{
                    backgroundColor: 'var(--admin-surface)',
                    color: 'var(--admin-text-primary)',
                  }}
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
            className="admin-btn text-xs py-1.5 px-2.5"
            style={{
              backgroundColor: 'transparent',
              color: '#F87171',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <i className="fas fa-undo text-[0.65rem]" />
            <span>Réinitialiser</span>
          </button>
        )}
      </div>

      {/* Right controls: count badge and refresh */}
      <div className="flex items-center gap-3">
        {totalCount !== undefined && (
          <div
            className="text-xs admin-mono-tabular font-medium flex items-center gap-1.5"
            style={{ color: 'var(--admin-text-secondary)' }}
          >
            <span>Affichage :</span>
            <span className="font-bold" style={{ color: 'var(--admin-text-primary)' }}>
              {filteredCount !== undefined ? filteredCount : totalCount}
            </span>
            {filteredCount !== undefined && filteredCount !== totalCount && (
              <span style={{ color: 'var(--admin-text-muted)' }}>/ {totalCount}</span>
            )}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="admin-btn text-xs py-2 px-3"
            style={{
              backgroundColor: 'var(--admin-accent-subtle)',
              color: 'var(--admin-accent)',
              border: '1px solid var(--admin-accent-border)',
            }}
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
