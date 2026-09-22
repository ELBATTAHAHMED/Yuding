import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  saveSearchOffers,
  saveSingleOffer,
  getOfferDetail,
  clearOfferStore,
} from '../offer-store.ts';
import type {
  FlightOffer,
  HotelOffer,
  ActivityOffer,
  TransferOffer,
  TrainOffer,
} from '../../types/travel.types.ts';

describe('Phase 32 — Offer Store & Resolution Contract', () => {
  beforeEach(() => {
    clearOfferStore();
  });

  it('saves and retrieves flight offers by offerId', () => {
    const mockFlight: FlightOffer = {
      offerId: 'flight-cmn-cdg-01',
      provider: 'SCRAPPA',
      airlineName: 'Royal Air Maroc',
      airlineCode: 'AT',
      flightNumber: '703',
      origin: 'CMN',
      destination: 'CDG',
      departureTime: '2026-10-15T08:00:00',
      arrivalTime: '2026-10-15T11:00:00',
      price: 250,
      currency: 'EUR',
      totalDurationMinutes: 180,
      stops: 0,
      legs: [
        {
          departureAirport: 'CMN',
          arrivalAirport: 'CDG',
          departureTime: '2026-10-15T08:00:00',
          arrivalTime: '2026-10-15T11:00:00',
          airlineName: 'Royal Air Maroc',
          airlineCode: 'AT',
          flightNumber: '703',
          durationMinutes: 180,
        },
      ],
    };

    saveSearchOffers('FLIGHT', [mockFlight]);

    const retrieved = getOfferDetail<FlightOffer>('FLIGHT', 'flight-cmn-cdg-01');
    assert.ok(retrieved != null);
    assert.strictEqual(retrieved.offerId, 'flight-cmn-cdg-01');
    assert.strictEqual(retrieved.airlineName, 'Royal Air Maroc');
    assert.strictEqual(retrieved.legs?.length, 1);
  });

  it('saves and retrieves hotel offers and room offers', () => {
    const mockHotel: HotelOffer = {
      offerId: 'hotel-riad-01',
      hotelId: 'lp1897',
      provider: 'NUITEE',
      name: 'Riad Jasmine Marrakech',
      city: 'Marrakech',
      country: 'Maroc',
      pricePerNight: 120,
      currency: 'EUR',
      starRating: 4,
      roomOffers: [
        {
          offerId: 'room-offer-01',
          roomName: 'Suite Deluxe Patio',
          price: 240,
          pricePerNight: 120,
          currency: 'EUR',
          refundable: true,
          cancellationDeadline: '2026-10-10 23:59:00',
        },
      ],
    };

    saveSingleOffer('HOTEL', mockHotel);

    const retrieved = getOfferDetail<HotelOffer>('HOTEL', 'hotel-riad-01');
    assert.ok(retrieved != null);
    assert.strictEqual(retrieved.name, 'Riad Jasmine Marrakech');
    assert.strictEqual(retrieved.roomOffers?.length, 1);
    assert.strictEqual(retrieved.roomOffers[0].refundable, true);
  });

  it('saves and retrieves activity offers preserving provider provenance', () => {
    const mockActivity: ActivityOffer = {
      offerId: 'act-desert-01',
      provider: 'HBX',
      title: 'Excursion Dunes Agafay & Dîner Berbère',
      category: 'Aventure',
      price: 65,
      currency: 'EUR',
      durationHours: 5,
      description: 'Découverte du désert d\'Agafay avec coucher de soleil et thé traditionnel.',
    };

    saveSearchOffers('ACTIVITY', [mockActivity]);

    const retrieved = getOfferDetail<ActivityOffer>('ACTIVITY', 'act-desert-01');
    assert.ok(retrieved != null);
    assert.strictEqual(retrieved.title, 'Excursion Dunes Agafay & Dîner Berbère');
    assert.strictEqual(retrieved.provider, 'HBX');
  });

  it('saves and retrieves transfer offers', () => {
    const mockTransfer: TransferOffer = {
      offerId: 'trf-rak-medina-01',
      provider: 'HBX',
      transferType: 'PRIVATE',
      vehicleModel: 'Mercedes Classe V',
      pickup: 'Aéroport RAK',
      dropoff: 'Médina Marrakech',
      price: 35,
      currency: 'EUR',
      capacity: 6,
    };

    saveSingleOffer('TRANSFER', mockTransfer);

    const retrieved = getOfferDetail<TransferOffer>('TRANSFER', 'trf-rak-medina-01');
    assert.ok(retrieved != null);
    assert.strictEqual(retrieved.vehicleModel, 'Mercedes Classe V');
    assert.strictEqual(retrieved.capacity, 6);
  });

  it('saves and retrieves train offers preserving multi-leg connections and null price', () => {
    const mockTrain: TrainOffer = {
      offerId: 'train-casa-tanger-01',
      provider: 'TRANSITLAND',
      source: 'TRANSITLAND_ONCF_GTFS',
      operator: 'ONCF',
      trainNumber: 'BORAQ_0700',
      routeName: 'Al Boraq / Casa - Tanger',
      productType: 'Al Boraq',
      originStation: 'Casa-Voyageurs',
      destinationStation: 'Tanger-Ville',
      departureDate: '2026-10-15',
      departureTime: '07:00',
      arrivalTime: '09:10',
      durationMinutes: 130,
      direct: true,
      stopsCount: 2,
      price: null, // GTFS fare is strictly absent
      currency: 'MAD',
    };

    saveSearchOffers('TRAIN', [mockTrain]);

    const retrieved = getOfferDetail<TrainOffer>('TRAIN', 'train-casa-tanger-01');
    assert.ok(retrieved != null);
    assert.strictEqual(retrieved.productType, 'Al Boraq');
    assert.strictEqual(retrieved.price, null);
  });

  it('returns null for non-existent or expired offer IDs', () => {
    const nonExistent = getOfferDetail<FlightOffer>('FLIGHT', 'unknown-offer-999');
    assert.strictEqual(nonExistent, null);
  });

  it('isolates product namespaces so same offerId in different products do not collide', () => {
    const flight: FlightOffer = {
      offerId: 'shared-id-123',
      origin: 'CMN',
      destination: 'ORY',
      departureTime: '10:00',
      arrivalTime: '14:00',
      price: 150,
      currency: 'EUR',
    };
    const transfer: TransferOffer = {
      offerId: 'shared-id-123',
      pickup: 'CMN',
      dropoff: 'Hotel',
      price: 40,
      currency: 'EUR',
    };

    saveSingleOffer('FLIGHT', flight);
    saveSingleOffer('TRANSFER', transfer);

    const retrievedFlight = getOfferDetail<FlightOffer>('FLIGHT', 'shared-id-123');
    const retrievedTransfer = getOfferDetail<TransferOffer>('TRANSFER', 'shared-id-123');

    assert.strictEqual(retrievedFlight?.origin, 'CMN');
    assert.strictEqual(retrievedTransfer?.pickup, 'CMN');
  });

  it('clears all store entries on clearOfferStore()', () => {
    saveSingleOffer('FLIGHT', {
      offerId: 'flight-to-clear',
      origin: 'CMN',
      destination: 'CDG',
      departureTime: '08:00',
      arrivalTime: '11:00',
      price: 100,
      currency: 'EUR',
    });

    assert.ok(getOfferDetail('FLIGHT', 'flight-to-clear') != null);

    clearOfferStore();

    assert.strictEqual(getOfferDetail('FLIGHT', 'flight-to-clear'), null);
  });
});
