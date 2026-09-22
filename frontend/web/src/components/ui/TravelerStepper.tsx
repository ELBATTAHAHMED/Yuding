import React from 'react';

export interface TravelerStepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  valueLabel?: (value: number) => React.ReactNode;
  field?: boolean;
  className?: string;
  decrementLabel?: string;
  incrementLabel?: string;
}

/**
 * Shared, theme-aware counter for all travel search passenger controls.
 * `field` makes the counter occupy the same visual footprint as a search input.
 */
export function TravelerStepper({
  value,
  min,
  max,
  onChange,
  label,
  valueLabel = (count) => count,
  field = false,
  className = '',
  decrementLabel = `Diminuer ${label}`,
  incrementLabel = `Augmenter ${label}`,
}: TravelerStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  return (
    <div
      className={`travel-stepper${field ? ' travel-stepper--field' : ''}${className ? ` ${className}` : ''}`}
      aria-label={`${label}: ${value}`}
    >
      <button
        type="button"
        aria-label={decrementLabel}
        disabled={atMin}
        onClick={() => !atMin && onChange(value - 1)}
        className="travel-stepper__button"
      >
        −
      </button>
      <span aria-live="polite" className="travel-stepper__value">
        {valueLabel(value)}
      </span>
      <button
        type="button"
        aria-label={incrementLabel}
        disabled={atMax}
        onClick={() => !atMax && onChange(value + 1)}
        className="travel-stepper__button"
      >
        +
      </button>
    </div>
  );
}
