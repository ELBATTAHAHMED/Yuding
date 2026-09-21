import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterHotels, getAccommodationType, hasAccommodationTypeData } from '../hotel-filters.ts';
import type { HotelOffer } from '../../types/travel.types.ts';

const hotel = (propertyType: string): HotelOffer => ({
  offerId: propertyType,
  propertyType,
  name: propertyType,
  pricePerNight: 100,
  currency: 'EUR',
});

describe('hotel accommodation category filters', () => {
  const results = [hotel('HOTEL'), hotel('RIAD'), hotel('VILLA'), hotel('HOUSE'), hotel('APARTMENT')];

  it('returns a new full list for ALL without mutating provider results', () => {
    const filtered = filterHotels(results, 'ALL');
    assert.deepEqual(filtered, results);
    assert.notStrictEqual(filtered, results);
  });

  it('groups hotels and riads', () => {
    assert.deepEqual(filterHotels(results, 'HOTEL_RIAD').map((h) => h.propertyType), ['HOTEL', 'RIAD']);
  });

  it('groups villas and houses, including the provider vacation-home alias', () => {
    const mixed = [...results, hotel('VACATION_HOME')];
    assert.deepEqual(filterHotels(mixed, 'VILLA_HOUSE').map((h) => h.propertyType), ['VILLA', 'HOUSE', 'VACATION_HOME']);
  });

  it('filters apartments', () => {
    assert.deepEqual(filterHotels(results, 'APARTMENT').map((h) => h.propertyType), ['APARTMENT']);
  });

  it('does not invent a category when the provider response has none', () => {
    const unclassified = [hotel('ALL')];
    assert.equal(getAccommodationType(unclassified[0]), null);
    assert.equal(hasAccommodationTypeData(unclassified), false);
    assert.deepEqual(filterHotels(unclassified, 'HOTEL_RIAD'), []);
  });
});
