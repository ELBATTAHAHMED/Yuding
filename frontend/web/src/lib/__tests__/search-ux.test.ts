import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  sortFlights,
  sortHotels,
  sortActivities,
  sortTransfers,
  buildActiveFilterChips,
  formatResultCount,
} from '../search-ux.ts';
import type { FlightOffer, HotelOffer, ActivityOffer, TransferOffer } from '../../types/travel.types.ts';

describe('Search UX - Flight Sorting', () => {
  const sampleFlights: FlightOffer[] = [
    {
      offerId: 'F1',
      origin: 'CMN',
      destination: 'CDG',
      departureTime: '2026-10-15T14:30:00',
      arrivalTime: '2026-10-15T18:30:00',
      price: 250,
      currency: 'EUR',
      totalDurationMinutes: 240,
    },
    {
      offerId: 'F2',
      origin: 'CMN',
      destination: 'CDG',
      departureTime: '2026-10-15T08:00:00',
      arrivalTime: '2026-10-15T11:00:00',
      price: 180,
      currency: 'EUR',
      totalDurationMinutes: 180,
    },
    {
      offerId: 'F3',
      origin: 'CMN',
      destination: 'CDG',
      departureTime: '2026-10-15T19:00:00',
      arrivalTime: '2026-10-15T23:30:00',
      price: 320,
      currency: 'EUR',
      totalDurationMinutes: 270,
    },
  ];

  it('sorts flights by price ascending (default)', () => {
    const sorted = sortFlights(sampleFlights, 'PRICE_ASC');
    assert.strictEqual(sorted[0].offerId, 'F2');
    assert.strictEqual(sorted[1].offerId, 'F1');
    assert.strictEqual(sorted[2].offerId, 'F3');
  });

  it('sorts flights by price descending', () => {
    const sorted = sortFlights(sampleFlights, 'PRICE_DESC');
    assert.strictEqual(sorted[0].offerId, 'F3');
    assert.strictEqual(sorted[1].offerId, 'F1');
    assert.strictEqual(sorted[2].offerId, 'F2');
  });

  it('sorts flights by shortest duration', () => {
    const sorted = sortFlights(sampleFlights, 'DURATION_ASC');
    assert.strictEqual(sorted[0].offerId, 'F2'); // 180m
    assert.strictEqual(sorted[1].offerId, 'F1'); // 240m
    assert.strictEqual(sorted[2].offerId, 'F3'); // 270m
  });

  it('sorts flights by earliest departure time', () => {
    const sorted = sortFlights(sampleFlights, 'DEPARTURE_ASC');
    assert.strictEqual(sorted[0].offerId, 'F2'); // 08:00
    assert.strictEqual(sorted[1].offerId, 'F1'); // 14:30
    assert.strictEqual(sorted[2].offerId, 'F3'); // 19:00
  });

  it('does not mutate original array', () => {
    const originalOrder = sampleFlights.map((f) => f.offerId);
    sortFlights(sampleFlights, 'PRICE_ASC');
    assert.deepStrictEqual(
      sampleFlights.map((f) => f.offerId),
      originalOrder
    );
  });
});

describe('Search UX - Hotel Sorting', () => {
  const sampleHotels: HotelOffer[] = [
    {
      offerId: 'H1',
      name: 'Riad Jasmine',
      pricePerNight: 120,
      currency: 'EUR',
      starRating: 4,
    },
    {
      offerId: 'H2',
      name: 'Palace Resort',
      pricePerNight: 350,
      currency: 'EUR',
      starRating: 5,
    },
    {
      offerId: 'H3',
      name: 'Budget Inn',
      pricePerNight: 60,
      currency: 'EUR',
      starRating: 2,
    },
  ];

  it('sorts hotels by price ascending', () => {
    const sorted = sortHotels(sampleHotels, 'PRICE_ASC');
    assert.strictEqual(sorted[0].offerId, 'H3');
    assert.strictEqual(sorted[1].offerId, 'H1');
    assert.strictEqual(sorted[2].offerId, 'H2');
  });

  it('sorts hotels by price descending', () => {
    const sorted = sortHotels(sampleHotels, 'PRICE_DESC');
    assert.strictEqual(sorted[0].offerId, 'H2');
    assert.strictEqual(sorted[1].offerId, 'H1');
    assert.strictEqual(sorted[2].offerId, 'H3');
  });

  it('sorts hotels by stars descending', () => {
    const sorted = sortHotels(sampleHotels, 'STARS_DESC');
    assert.strictEqual(sorted[0].offerId, 'H2'); // 5 stars
    assert.strictEqual(sorted[1].offerId, 'H1'); // 4 stars
    assert.strictEqual(sorted[2].offerId, 'H3'); // 2 stars
  });
});

describe('Search UX - Activity Sorting', () => {
  const sampleActivities: ActivityOffer[] = [
    {
      offerId: 'A1',
      title: 'Desert Quad Tour',
      category: 'Aventure',
      price: 45,
      currency: 'EUR',
    },
    {
      offerId: 'A2',
      title: 'Luxury Hammam & Spa',
      category: 'Bien-être',
      price: 110,
      currency: 'EUR',
    },
    {
      offerId: 'A3',
      title: 'Medina Walking Tour',
      category: 'Culture',
      price: 25,
      currency: 'EUR',
    },
  ];

  it('sorts activities by price ascending', () => {
    const sorted = sortActivities(sampleActivities, 'PRICE_ASC');
    assert.strictEqual(sorted[0].offerId, 'A3');
    assert.strictEqual(sorted[1].offerId, 'A1');
    assert.strictEqual(sorted[2].offerId, 'A2');
  });

  it('sorts activities by price descending', () => {
    const sorted = sortActivities(sampleActivities, 'PRICE_DESC');
    assert.strictEqual(sorted[0].offerId, 'A2');
    assert.strictEqual(sorted[1].offerId, 'A1');
    assert.strictEqual(sorted[2].offerId, 'A3');
  });
});

describe('Search UX - Transfer Sorting', () => {
  const sampleTransfers: TransferOffer[] = [
    {
      offerId: 'T1',
      type: 'TAXI',
      price: 40,
      currency: 'EUR',
      capacity: 3,
    },
    {
      offerId: 'T2',
      type: 'PRIVATE',
      price: 80,
      currency: 'EUR',
      capacity: 4,
    },
    {
      offerId: 'T3',
      type: 'CAR_RENTAL',
      price: 25,
      currency: 'EUR',
      capacity: 5,
    },
  ];

  it('sorts transfers by price ascending', () => {
    const sorted = sortTransfers(sampleTransfers, 'PRICE_ASC');
    assert.strictEqual(sorted[0].offerId, 'T3');
    assert.strictEqual(sorted[1].offerId, 'T1');
    assert.strictEqual(sorted[2].offerId, 'T2');
  });

  it('sorts transfers by price descending', () => {
    const sorted = sortTransfers(sampleTransfers, 'PRICE_DESC');
    assert.strictEqual(sorted[0].offerId, 'T2');
    assert.strictEqual(sorted[1].offerId, 'T1');
    assert.strictEqual(sorted[2].offerId, 'T3');
  });
});

describe('Search UX - Filter Chips and Count Formatting', () => {
  it('builds active filter chips correctly', () => {
    const chips = buildActiveFilterChips([
      { key: 'cabin', label: 'Classe Affaires', active: true },
      { key: 'non_stop', label: 'Direct uniquement', active: false },
      { key: 'hotel_type', label: 'Villas & Maisons', active: true },
    ]);

    assert.strictEqual(chips.length, 2);
    assert.strictEqual(chips[0].key, 'cabin');
    assert.strictEqual(chips[1].key, 'hotel_type');
  });

  it('formats result counts in French accurately', () => {
    assert.strictEqual(formatResultCount(0, 'vol'), '0 vol trouvé');
    assert.strictEqual(formatResultCount(1, 'vol'), '1 vol trouvé');
    assert.strictEqual(formatResultCount(5, 'vol'), '5 vols trouvés');
    assert.strictEqual(formatResultCount(1, 'hôtel'), '1 hôtel trouvé');
    assert.strictEqual(formatResultCount(12, 'hôtel'), '12 hôtels trouvés');
  });
});
