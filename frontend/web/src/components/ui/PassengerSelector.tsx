import React from 'react';

export interface PassengerRow {
  /** Internal key, unique per row */
  key: string;
  /** Displayed label, e.g. "Adultes", "Enfants (2–11 ans)" */
  label: string;
  /** Optional sub-label shown below the main label */
  subLabel?: string;
  value: number;
  min: number;
  max: number;
}

export interface PassengerSelectorProps {
  rows: PassengerRow[];
  onChange: (key: string, value: number) => void;
  className?: string;
}

const stepperBtn: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '6px',
  border: '1px solid #ccc',
  background: '#f5f5f5',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1rem',
  fontWeight: 700,
  cursor: 'pointer',
  userSelect: 'none',
  transition: 'background 0.15s ease',
  flexShrink: 0,
};

const stepperBtnDisabled: React.CSSProperties = {
  ...stepperBtn,
  opacity: 0.35,
  cursor: 'not-allowed',
};

/**
 * Reusable passenger / guest counter widget.
 * Renders one row per entry in `rows` with decrement and increment buttons.
 */
export const PassengerSelector: React.FC<PassengerSelectorProps> = ({
  rows,
  onChange,
  className = '',
}) => {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {rows.map((row) => {
        const atMin = row.value <= row.min;
        const atMax = row.value >= row.max;
        return (
          <div
            key={row.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
            }}
          >
            {/* Label */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, display: 'block' }}>
                {row.label}
              </span>
              {row.subLabel && (
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>
                  {row.subLabel}
                </span>
              )}
            </div>

            {/* Stepper */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <button
                type="button"
                aria-label={`Diminuer ${row.label}`}
                disabled={atMin}
                onClick={() => !atMin && onChange(row.key, row.value - 1)}
                style={atMin ? stepperBtnDisabled : stepperBtn}
              >
                −
              </button>

              <span
                aria-live="polite"
                style={{
                  minWidth: '28px',
                  textAlign: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                }}
              >
                {row.value}
              </span>

              <button
                type="button"
                aria-label={`Augmenter ${row.label}`}
                disabled={atMax}
                onClick={() => !atMax && onChange(row.key, row.value + 1)}
                style={atMax ? stepperBtnDisabled : stepperBtn}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
