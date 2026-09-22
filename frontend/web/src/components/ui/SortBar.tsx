import React from 'react';

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
}

export interface SortBarProps<T extends string = string> {
  /** Total result count to display */
  count: number;
  /** Label for results, e.g. "vol" (singular) */
  resultLabel: string;
  /** Sort options to show in the dropdown */
  sortOptions: SortOption<T>[];
  /** Currently selected sort value */
  currentSort: T;
  /** Called when the sort changes */
  onSortChange: (value: T) => void;
  /** Active filter chips to display (pass empty array to hide chip row) */
  activeChips?: ActiveFilterChip[];
  /** Called when a chip's × button is clicked */
  onChipRemove?: (key: string) => void;
  className?: string;
}

/**
 * Results toolbar:  "[N] vols trouvés  |  Trier par [▾]  |  [chip ×] [chip ×]"
 * Appears above the results list once a search completes.
 */
export function SortBar<T extends string>({
  count,
  resultLabel,
  sortOptions,
  currentSort,
  onSortChange,
  activeChips = [],
  onChipRemove,
  className = '',
}: SortBarProps<T>) {
  const plural = count !== 1;
  const countLabel = `${count} ${resultLabel}${plural ? 's' : ''} trouvé${plural ? 's' : ''}`;

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        padding: '0.75rem 1rem',
        background: 'var(--card, #fff)',
        borderRadius: '10px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.05)',
        marginBottom: '1rem',
      }}
    >
      {/* Result count */}
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.95rem',
          color: '#01796F',
          flexShrink: 0,
        }}
      >
        {countLabel}
      </span>

      {/* Divider */}
      <span style={{ color: '#ccc', flexShrink: 0 }}>|</span>

      {/* Sort dropdown */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', flexShrink: 0 }}>
        <i className="fas fa-sort" style={{ color: '#888', fontSize: '0.8rem' }} />
        <span style={{ color: '#555', fontWeight: 600 }}>Trier :</span>
        <select
          value={currentSort}
          onChange={(e) => onSortChange(e.target.value as T)}
          style={{
            padding: '0.3rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid #ddd',
            fontSize: '0.88rem',
            background: '#fafafa',
            cursor: 'pointer',
          }}
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {/* Active filter chips */}
      {activeChips.length > 0 && (
        <>
          <span style={{ color: '#ccc', flexShrink: 0 }}>|</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.25rem 0.6rem',
                background: 'rgba(1, 121, 111, 0.1)',
                color: '#01796F',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {chip.label}
              {onChipRemove && (
                <button
                  type="button"
                  aria-label={`Supprimer le filtre ${chip.label}`}
                  onClick={() => onChipRemove(chip.key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#01796F',
                    padding: 0,
                    lineHeight: 1,
                    fontSize: '0.85rem',
                  }}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </>
      )}
    </div>
  );
}
