import type { HotelOffer } from '../types/travel.types.ts';

export type HotelCategoryFilter = 'ALL' | 'HOTEL_RIAD' | 'VILLA_HOUSE' | 'APARTMENT';
export type AccommodationType = 'HOTEL' | 'RIAD' | 'VILLA' | 'HOUSE' | 'APARTMENT';

/**
 * Resolve only an explicit provider/backend classification.  Names, room names,
 * and arbitrary keywords are intentionally not used as a fallback.
 */
export function getAccommodationType(hotel: HotelOffer): AccommodationType | null {
  const raw = hotel.accommodationType ?? hotel.propertyType ?? hotel.type;
  if (!raw) return null;

  switch (raw.trim().toUpperCase()) {
    case 'HOTEL':
      return 'HOTEL';
    case 'RIAD':
      return 'RIAD';
    case 'VILLA':
      return 'VILLA';
    case 'HOUSE':
    case 'HOLIDAY_HOME':
    case 'VACATION_HOME':
      return 'HOUSE';
    case 'APARTMENT':
    case 'APARTHOTEL':
      return 'APARTMENT';
    default:
      return null;
  }
}

export function filterHotels(
  hotels: readonly HotelOffer[],
  category: HotelCategoryFilter
): HotelOffer[] {
  if (category === 'ALL') return [...hotels];

  return hotels.filter((hotel) => {
    const type = getAccommodationType(hotel);
    if (category === 'HOTEL_RIAD') return type === 'HOTEL' || type === 'RIAD';
    if (category === 'VILLA_HOUSE') return type === 'VILLA' || type === 'HOUSE';
    return type === 'APARTMENT';
  });
}

export function hasAccommodationTypeData(hotels: readonly HotelOffer[]): boolean {
  return hotels.some((hotel) => getAccommodationType(hotel) !== null);
}
