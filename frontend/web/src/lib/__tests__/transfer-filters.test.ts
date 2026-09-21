import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  filterTransfers,
  isPrivateTransfer,
  isSharedNavette,
  isMinibusOrRental,
  getTransferCategoryCounts,
  type TransferCategoryFilter,
} from '../transfer-filters.ts';
import type { TransferOffer } from '../../types/travel.types.ts';

const mockOffer = (partial: Partial<TransferOffer>): TransferOffer => ({
  id: 'trf-1',
  offerId: 'trf-offer-1',
  provider: 'HBX',
  price: 25.0,
  currency: 'EUR',
  vehicleModel: 'Berline Standard',
  transferType: 'PRIVATE',
  capacity: 3,
  ...partial,
});

describe('Phase 25 — Transfer vehicle mode filters', () => {
  const privateSedan = mockOffer({
    offerId: 'private-sedan',
    transferType: 'PRIVATE',
    vehicleModel: 'Berline Confort',
    capacity: 3,
  });

  const sharedShuttle = mockOffer({
    offerId: 'shared-shuttle',
    transferType: 'SHARED',
    vehicleModel: 'Navette Aéroport',
    capacity: 99,
  });

  const privateMinivan = mockOffer({
    offerId: 'private-minivan',
    transferType: 'PRIVATE',
    vehicleModel: 'Minivan VIP',
    capacity: 7,
  });

  const publicBus = mockOffer({
    offerId: 'public-bus',
    transferType: 'SHARED',
    vehicleModel: 'Bus Régulier',
    capacity: 50,
  });

  const allOffers = [privateSedan, sharedShuttle, privateMinivan, publicBus];

  it('ALL filter returns all offers', () => {
    const result = filterTransfers(allOffers, 'ALL');
    assert.equal(result.length, 4);
    assert.deepEqual(result, allOffers);
  });

  it('TAXI filter returns private transfers and VTC', () => {
    const result = filterTransfers(allOffers, 'TAXI');
    assert.equal(result.length, 2);
    assert.ok(result.some((o) => o.offerId === 'private-sedan'));
    assert.ok(result.some((o) => o.offerId === 'private-minivan'));
    assert.ok(!result.some((o) => o.offerId === 'shared-shuttle'));
  });

  it('TRAIN filter returns shared shuttles and buses', () => {
    const result = filterTransfers(allOffers, 'TRAIN');
    assert.equal(result.length, 2);
    assert.ok(result.some((o) => o.offerId === 'shared-shuttle'));
    assert.ok(result.some((o) => o.offerId === 'public-bus'));
    assert.ok(!result.some((o) => o.offerId === 'private-sedan'));
  });

  it('CAR_RENTAL filter returns minivans and minibuses', () => {
    const result = filterTransfers(allOffers, 'CAR_RENTAL');
    assert.equal(result.length, 1);
    assert.equal(result[0].offerId, 'private-minivan');
  });

  it('calculates category counts correctly', () => {
    const counts = getTransferCategoryCounts(allOffers);
    assert.equal(counts.all, 4);
    assert.equal(counts.private, 2);
    assert.equal(counts.shared, 2);
    assert.equal(counts.minibus, 1);
  });

  it('handles empty transfers array gracefully', () => {
    const emptyCounts = getTransferCategoryCounts([]);
    assert.deepEqual(emptyCounts, { all: 0, private: 0, shared: 0, minibus: 0 });

    assert.deepEqual(filterTransfers([], 'TAXI'), []);
    assert.deepEqual(filterTransfers([], 'ALL'), []);
  });
});
