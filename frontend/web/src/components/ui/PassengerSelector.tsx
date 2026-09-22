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
    <div className={`travel-passenger-selector ${className}`}>
      {rows.map((row) => {
        const atMin = row.value <= row.min;
        const atMax = row.value >= row.max;
        return (
          <div
            key={row.key}
            className="travel-passenger-row"
          >
            {/* Label */}
            <div className="travel-passenger-row__label">
              <span className="travel-passenger-row__title">
                {row.label}
              </span>
              {row.subLabel && (
                <span className="travel-passenger-row__subtitle">
                  {row.subLabel}
                </span>
              )}
            </div>

            {/* Stepper */}
            <div className="travel-stepper" aria-label={`${row.label}: ${row.value}`}>
              <button
                type="button"
                aria-label={`Diminuer ${row.label}`}
                disabled={atMin}
                onClick={() => !atMin && onChange(row.key, row.value - 1)}
                className="travel-stepper__button"
              >
                −
              </button>

              <span
                aria-live="polite"
                className="travel-stepper__value"
              >
                {row.value}
              </span>

              <button
                type="button"
                aria-label={`Augmenter ${row.label}`}
                disabled={atMax}
                onClick={() => !atMax && onChange(row.key, row.value + 1)}
                className="travel-stepper__button"
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
