/**
 * Yuding V2 - Centralized Query Keys
 *
 * Defines typed query key factories for TanStack Query to ensure deterministic
 * cache key construction, predictable invalidation, and zero typo risks.
 */

export const queryKeys = {
  auth: {
    all: ['auth'] as const,
    me: () => [...queryKeys.auth.all, 'me'] as const,
    sessions: () => [...queryKeys.auth.all, 'sessions'] as const,
    securityEvents: () => [...queryKeys.auth.all, 'security-events'] as const,
  },
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    stats: () => [...queryKeys.admin.all, 'stats'] as const,
    reservations: () => [...queryKeys.admin.all, 'reservations'] as const,
    payments: () => [...queryKeys.admin.all, 'payments'] as const,
  },
  booking: {
    all: ['booking'] as const,
    my: () => [...queryKeys.booking.all, 'my'] as const,
    detail: (reference: string) => [...queryKeys.booking.all, 'detail', reference] as const,
  },
  travel: {
    all: ['travel'] as const,
    airports: () => [...queryKeys.travel.all, 'airports'] as const,
    destinations: () => [...queryKeys.travel.all, 'destinations'] as const,
    hotels: (filter?: { country?: string; city?: string }) =>
      [...queryKeys.travel.all, 'hotels', filter || {}] as const,
    flights: (filter?: { origin?: string; city?: string; destination?: string }) =>
      [...queryKeys.travel.all, 'flights', filter || {}] as const,
    transfers: (filter?: { city?: string; type?: string }) =>
      [...queryKeys.travel.all, 'transfers', filter || {}] as const,
    activities: (filter?: { city?: string }) =>
      [...queryKeys.travel.all, 'activities', filter || {}] as const,
    weather: (lat: number, lon: number, forecastDays?: number) =>
      [...queryKeys.travel.all, 'weather', lat, lon, forecastDays ?? 7] as const,
    destinationImages: (city: string, country?: string, limit?: number) =>
      [...queryKeys.travel.all, 'destination-images', city.toLowerCase().trim(), (country || '').toLowerCase().trim(), limit ?? 3] as const,
  },
} as const;
