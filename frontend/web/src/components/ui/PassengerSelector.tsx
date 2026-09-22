import React from 'react';
import { TravelerStepper } from './TravelerStepper';

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
            <TravelerStepper
              value={row.value}
              min={row.min}
              max={row.max}
              label={row.label}
              onChange={(value) => onChange(row.key, value)}
            />
          </div>
        );
      })}
    </div>
  );
};
