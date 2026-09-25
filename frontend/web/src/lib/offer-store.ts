/**
 * offer-store.ts
 *
 * Client-side session-backed offer resolution store for Phase 32.
 *
 * Stores normalized search results in memory and sessionStorage during active
 * browsing sessions. Allows offer detail pages (`/[product]/[offerId]`) to
 * resolve their data instantly on navigation or page refresh.
 *
 * If an offer cannot be found (e.g. session expired, direct deep link to old search),
 * `getOfferDetail` returns `null` so the UI can render the graceful `<OfferExpiredState>`.
 */

export type TravelProductType = 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'TRAIN';

const STORAGE_PREFIX = 'yuding:v2:offers:';

// In-memory cache for ultra-fast same-render / client-transition lookups
const memoryStore = new Map<string, { product: TravelProductType; data: unknown; timestamp: number }>();

function buildStoreKey(product: TravelProductType, offerId: string): string {
  return `${STORAGE_PREFIX}${product.toLowerCase()}:${offerId}`;
}

/**
 * Saves a list of offers from a search response into the session store.
 */
export function saveSearchOffers<T extends { offerId?: string; id?: string }>(
  product: TravelProductType,
  offers: T[]
): void {
  if (!offers || !Array.isArray(offers)) return;

  const now = Date.now();
  for (const offer of offers) {
    const rawIds = [offer.offerId, offer.id, (offer as any).hotelId].filter(
      (id): id is string => typeof id === 'string' && id.trim().length > 0
    );
    const uniqueIds = Array.from(new Set(rawIds));
    if (uniqueIds.length === 0) continue;

    for (const id of uniqueIds) {
      const key = buildStoreKey(product, id);

      // Save to memory
      memoryStore.set(key, { product, data: offer, timestamp: now });

      // Save to sessionStorage (safe fallback if window is available)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          window.sessionStorage.setItem(
            key,
            JSON.stringify({ product, data: offer, timestamp: now })
          );
        } catch {
          // Ignore quota errors in storage
        }
      }
    }
  }
}

/**
 * Saves a single offer into the session store.
 */
export function saveSingleOffer<T extends { offerId?: string; id?: string }>(
  product: TravelProductType,
  offer: T
): void {
  saveSearchOffers(product, [offer]);
}

/**
 * Retrieves an offer by product type and offerId.
 * Checks memory first, then sessionStorage.
 * Returns null if not found or expired.
 */
export function getOfferDetail<T>(product: TravelProductType, offerId: string): T | null {
  if (!offerId) return null;

  const key = buildStoreKey(product, offerId);

  // Check in-memory store first
  const memoryEntry = memoryStore.get(key);
  if (memoryEntry && memoryEntry.data) {
    return memoryEntry.data as T;
  }

  // Check sessionStorage
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.data) {
          // Re-populate memory store
          memoryStore.set(key, parsed);
          return parsed.data as T;
        }
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Clears all cached offers from memory and sessionStorage.
 */
export function clearOfferStore(): void {
  memoryStore.clear();
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const k = window.sessionStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => window.sessionStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}
