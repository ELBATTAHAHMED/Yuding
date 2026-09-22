/**
 * search-ux.ts
 *
 * Pure client-side helpers for the Phase 31 professional search UX.
 * All functions are deterministic and require no external I/O — safe to test
 * in isolation without any live provider calls.
 */

import type { FlightOffer, HotelOffer, ActivityOffer, TransferOffer } from '../types/travel.types.ts';

// ─── Flight Sorting ────────────────────────────────────────────────────────

export type FlightSortKey = 'PRICE_ASC' | 'PRICE_DESC' | 'DURATION_ASC' | 'DEPARTURE_ASC';

export function sortFlights(flights: FlightOffer[], key: FlightSortKey): FlightOffer[] {
  const arr = [...flights];
  switch (key) {
    case 'PRICE_ASC':
      return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case 'PRICE_DESC':
      return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    case 'DURATION_ASC':
      return arr.sort((a, b) => (a.totalDurationMinutes ?? 0) - (b.totalDurationMinutes ?? 0));
    case 'DEPARTURE_ASC':
      return arr.sort((a, b) => {
        const ta = a.departureTime ?? '';
        const tb = b.departureTime ?? '';
        return ta < tb ? -1 : ta > tb ? 1 : 0;
      });
    default:
      return arr;
  }
}

// ─── Hotel Sorting ─────────────────────────────────────────────────────────

export type HotelSortKey = 'PRICE_ASC' | 'PRICE_DESC' | 'STARS_DESC';

export function sortHotels(hotels: HotelOffer[], key: HotelSortKey): HotelOffer[] {
  const arr = [...hotels];
  switch (key) {
    case 'PRICE_ASC':
      return arr.sort((a, b) => (a.pricePerNight ?? 0) - (b.pricePerNight ?? 0));
    case 'PRICE_DESC':
      return arr.sort((a, b) => (b.pricePerNight ?? 0) - (a.pricePerNight ?? 0));
    case 'STARS_DESC':
      return arr.sort((a, b) => (b.starRating ?? b.rating ?? 0) - (a.starRating ?? a.rating ?? 0));
    default:
      return arr;
  }
}

// ─── Activity Sorting ──────────────────────────────────────────────────────

export type ActivitySortKey = 'PRICE_ASC' | 'PRICE_DESC';

export function sortActivities(activities: ActivityOffer[], key: ActivitySortKey): ActivityOffer[] {
  const arr = [...activities];
  switch (key) {
    case 'PRICE_ASC':
      return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case 'PRICE_DESC':
      return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    default:
      return arr;
  }
}

// ─── Transfer Sorting ──────────────────────────────────────────────────────

export type TransferSortKey = 'PRICE_ASC' | 'PRICE_DESC';

export function sortTransfers(transfers: TransferOffer[], key: TransferSortKey): TransferOffer[] {
  const arr = [...transfers];
  switch (key) {
    case 'PRICE_ASC':
      return arr.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
    case 'PRICE_DESC':
      return arr.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
    default:
      return arr;
  }
}

// ─── Active Filter Chips ───────────────────────────────────────────────────

export interface FilterChipDescriptor {
  key: string;
  /** Human-readable label for the chip */
  label: string;
  /** When true, this filter is "active" and should produce a chip */
  active: boolean;
}

export interface ActiveFilterChip {
  key: string;
  label: string;
}

/**
 * Returns only the descriptors that are currently active (i.e., should appear as chips).
 */
export function buildActiveFilterChips(
  descriptors: FilterChipDescriptor[]
): ActiveFilterChip[] {
  return descriptors
    .filter((d) => d.active)
    .map((d) => ({ key: d.key, label: d.label }));
}

// ─── Result Count Label ────────────────────────────────────────────────────

/**
 * Formats a localized result count string.
 *
 * @param count   Number of results
 * @param label   Singular noun, e.g. "vol", "hôtel", "activité", "transfert"
 * @returns       e.g. "12 vols trouvés", "1 vol trouvé", "0 vol trouvé"
 */
export function formatResultCount(count: number, label: string): string {
  const plural = count > 1;
  // French plural rules for common travel nouns
  const pluralLabel = plural ? `${label}s` : label;
  const agreement = plural ? 'trouvés' : 'trouvé';
  return `${count} ${pluralLabel} ${agreement}`;
}
