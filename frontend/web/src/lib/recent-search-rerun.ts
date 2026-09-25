import type { RecentSearchItem } from '../types/library.types.ts';

/** Carry only search criteria to a vertical. The destination page starts a fresh provider request. */
export function getSearchRerunUrl(search: RecentSearchItem): string {
  const criteria = search.criteriaPayload || {};
  const type = search.searchType.toUpperCase();
  const params = new URLSearchParams({ rerun: '1' });
  const put = (key: string, value: unknown) => {
    if (value !== null && value !== undefined && String(value).trim()) params.set(key, String(value));
  };

  if (type.startsWith('FLIGHT')) {
    put('origin', search.origin);
    put('destination', search.destination);
    put('departureDate', search.departureDate);
    put('adults', criteria.adults ?? 1);
    put('children', criteria.children ?? 0);
    put('infants', criteria.infants ?? 0);
    put('travelClass', criteria.travelClass ?? 'ECONOMY');
    return `/flights?${params}`;
  }
  if (type.startsWith('HOTEL')) {
    put('destination', search.destination ?? criteria.city);
    put('checkIn', search.departureDate);
    put('checkOut', search.returnDate);
    put('countryCode', criteria.countryCode);
    put('adults', criteria.adults ?? search.travelersCount ?? 2);
    put('guestNationality', criteria.guestNationality ?? 'MA');
    if (Array.isArray(criteria.occupancies)) put('occupancies', JSON.stringify(criteria.occupancies));
    return `/hotels?${params}`;
  }
  if (type.startsWith('ACTIVIT')) {
    put('destination', search.destination ?? criteria.city);
    put('date', search.departureDate);
    put('travelers', search.travelersCount ?? 1);
    put('category', criteria.category);
    return `/activities?${params}`;
  }
  if (type.startsWith('TRANSFER')) {
    put('pickup', search.origin ?? criteria.pickup);
    put('dropoff', search.destination ?? criteria.dropoff);
    put('date', search.departureDate ?? criteria.date);
    put('time', criteria.time);
    put('passengers', criteria.passengers ?? search.travelersCount ?? 2);
    return `/transfers?${params}`;
  }
  if (type.startsWith('TRAIN')) {
    put('origin', search.origin ?? criteria.originStation);
    put('destination', search.destination ?? criteria.destinationStation);
    put('originId', criteria.originStationId);
    put('destinationId', criteria.destinationStationId);
    put('date', search.departureDate ?? criteria.date);
    put('departureTime', criteria.departureTime);
    put('passengers', criteria.passengers ?? search.travelersCount ?? 1);
    return `/trains?${params}`;
  }
  if (type.startsWith('TRIP')) {
    put('origin', search.origin);
    put('destination', search.destination);
    return `/planifier?${params}`;
  }
  return '/';
}
