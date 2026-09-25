export type FavoriteResourceType = 'HOTEL' | 'ACTIVITY' | 'DESTINATION';

export interface FavoriteItem {
  publicReference: string;
  resourceType: FavoriteResourceType;
  resourceReference: string;
  title: string;
  destination?: string | null;
  thumbnailUrl?: string | null;
  providerLabel?: string | null;
  priceSnapshot?: number | null;
  currencySnapshot?: string | null;
  capturedAt: string;
  createdAt: string;
}

export interface FavoriteRequest {
  resourceType: FavoriteResourceType;
  resourceReference: string;
  title: string;
  destination?: string | null;
  thumbnailUrl?: string | null;
  providerLabel?: string | null;
  priceSnapshot?: number | null;
  currencySnapshot?: string | null;
}

export interface SavedTripItem {
  publicReference: string;
  tripPlanReference: string;
  title: string;
  destinationCity: string;
  originCity: string;
  startDate: string;
  endDate: string;
  travelersCount: number;
  budgetAmount?: number | null;
  budgetCurrency?: string | null;
  planCreatedAt?: string | null;
  savedAt: string;
}

export interface SavedTripRequest {
  tripPlanReference: string;
}

export type SearchVerticalType = 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER' | 'TRAIN' | 'TRIP' | 'FLIGHTS' | 'HOTELS' | 'ACTIVITIES' | 'TRANSFERS' | 'TRAINS';

export interface RecentSearchItem {
  publicReference: string;
  searchType: SearchVerticalType;
  origin?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  travelersCount?: number | null;
  criteriaPayload: Record<string, any>;
  lastSearchedAt: string;
  createdAt: string;
  isExpired: boolean;
}

export interface RecentSearchRequest {
  searchType: SearchVerticalType;
  origin?: string | null;
  destination?: string | null;
  departureDate?: string | null;
  returnDate?: string | null;
  travelersCount?: number | null;
  criteriaPayload?: Record<string, any>;
}

export interface RecentViewItem {
  publicReference: string;
  resourceType: FavoriteResourceType;
  resourceReference: string;
  title: string;
  destination?: string | null;
  thumbnailUrl?: string | null;
  providerLabel?: string | null;
  lastViewedAt: string;
  createdAt: string;
}

export interface RecentViewRequest {
  resourceType: FavoriteResourceType;
  resourceReference: string;
  title: string;
  destination?: string | null;
  thumbnailUrl?: string | null;
  providerLabel?: string | null;
}
