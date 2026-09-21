import type { TransferOffer } from '../types/travel.types.ts';

export type TransferCategoryFilter = 'ALL' | 'TAXI' | 'TRAIN' | 'CAR_RENTAL';

/**
 * Checks if a transfer offer corresponds to a private transfer or VTC (chauffeur / berline / taxi).
 */
export function isPrivateTransfer(item: TransferOffer): boolean {
  if (item.type === 'TAXI') return true;
  const tType = (item.transferType || '').toUpperCase();
  const model = (item.vehicleModel || '').toLowerCase();

  if (tType === 'PRIVATE') return true;
  if (
    model.includes('voiture') ||
    model.includes('berline') ||
    model.includes('sedan') ||
    model.includes('taxi') ||
    model.includes('vtc') ||
    model.includes('privé') ||
    model.includes('prive') ||
    model.includes('standard') ||
    model.includes('confort') ||
    model.includes('vip')
  ) {
    return true;
  }
  // Default fallback if not shared or bus
  if (tType !== 'SHARED' && tType !== 'SHUTTLE' && !model.includes('navette') && !model.includes('shuttle') && !model.includes('bus')) {
    return true;
  }
  return false;
}

/**
 * Checks if a transfer offer corresponds to a shared shuttle, train, or bus.
 */
export function isSharedNavette(item: TransferOffer): boolean {
  if (item.type === 'TRAIN') return true;
  const tType = (item.transferType || '').toUpperCase();
  const model = (item.vehicleModel || '').toLowerCase();

  if (tType === 'SHARED' || tType === 'SHUTTLE') return true;
  if (
    model.includes('navette') ||
    model.includes('shuttle') ||
    model.includes('train') ||
    model.includes('bus') ||
    model.includes('partag') ||
    model.includes('autocar')
  ) {
    return true;
  }
  return false;
}

/**
 * Checks if a transfer offer corresponds to a minibus, minivan, or car rental.
 */
export function isMinibusOrRental(item: TransferOffer): boolean {
  if (item.type === 'CAR_RENTAL') return true;
  const tType = (item.transferType || '').toUpperCase();
  const model = (item.vehicleModel || '').toLowerCase();

  if (
    model.includes('minibus') ||
    model.includes('minivan') ||
    model.includes('van') ||
    model.includes('location') ||
    model.includes('suv') ||
    model.includes('monovolume') ||
    model.includes('mpv')
  ) {
    return true;
  }
  // Non-shared transfer with capacity between 5 and 16
  if (tType !== 'SHARED' && item.capacity && item.capacity >= 5 && item.capacity <= 16) {
    return true;
  }
  return false;
}

/**
 * Filters the list of transfer offers based on the selected vehicle mode filter.
 */
export function filterTransfers(
  transfers: readonly TransferOffer[],
  category: TransferCategoryFilter
): TransferOffer[] {
  if (category === 'ALL') return [...transfers];

  return transfers.filter((item) => {
    if (category === 'TAXI') return isPrivateTransfer(item);
    if (category === 'TRAIN') return isSharedNavette(item);
    if (category === 'CAR_RENTAL') return isMinibusOrRental(item);
    return true;
  });
}

/**
 * Returns the counts of offers for each transfer category filter.
 */
export function getTransferCategoryCounts(transfers: readonly TransferOffer[]) {
  return {
    all: transfers.length,
    private: transfers.filter(isPrivateTransfer).length,
    shared: transfers.filter(isSharedNavette).length,
    minibus: transfers.filter(isMinibusOrRental).length,
  };
}
