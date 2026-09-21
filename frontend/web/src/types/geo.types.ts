/**
 * Provider-neutral Geo & Places types (Phase 26 - Geoapify).
 */

export interface GeoPlace {
  id: string;
  provider?: string;
  name: string;
  formatted: string;
  type?: string;
  city?: string;
  state?: string;
  country?: string;
  countryCode?: string;
  postcode?: string;
  latitude: number;
  longitude: number;
}

export interface NearbyPlace {
  id: string;
  provider?: string;
  name: string;
  category: string;
  rawCategories?: string[];
  formattedAddress?: string;
  distanceMeters?: number;
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
}

export interface GeoAutocompleteParams {
  text: string;
  type?: string;
  language?: string;
  country?: string;
  limit?: number;
  biasLat?: number;
  biasLon?: number;
}

export interface GeoGeocodeParams {
  text: string;
  language?: string;
  country?: string;
  limit?: number;
}

export interface GeoReverseParams {
  lat: number;
  lon: number;
  language?: string;
}

export interface NearbyPlacesParams {
  lat: number;
  lon: number;
  radius?: number;
  categories?: string[] | string;
  limit?: number;
  language?: string;
}

export interface StaticMapParams {
  lat: number;
  lon: number;
  zoom?: number;
  width?: number;
  height?: number;
  markers?: string;
}
