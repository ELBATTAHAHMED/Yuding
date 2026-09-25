import { apiClient } from '../lib/api-client.ts';
import type {
  GeoAutocompleteParams,
  GeoGeocodeParams,
  GeoPlace,
  GeoReverseParams,
  NearbyPlace,
  NearbyPlacesParams,
  StaticMapParams,
} from '../types/geo.types.ts';

export const geoService = {
  /**
   * Search place and city suggestions via Gateway -> travel-service (/travel/geo/autocomplete)
   */
  async autocomplete(params: GeoAutocompleteParams): Promise<GeoPlace[]> {
    if (!params.text || params.text.trim().length < 2) {
      return [];
    }

    const query = new URLSearchParams();
    query.set('text', params.text.trim());

    if (params.type) query.set('type', params.type);
    if (params.language) query.set('language', params.language);
    if (params.country) query.set('country', params.country);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.biasLat !== undefined) query.set('biasLat', String(params.biasLat));
    if (params.biasLon !== undefined) query.set('biasLon', String(params.biasLon));

    try {
      const res = await apiClient.get<GeoPlace[]>(`/travel/geo/autocomplete?${query.toString()}`);
      return res ?? [];
    } catch {
      return [];
    }
  },

  /**
   * Forward geocode address or place text via Gateway -> travel-service (/travel/geo/geocode)
   */
  async geocode(params: GeoGeocodeParams): Promise<GeoPlace[]> {
    if (!params.text || !params.text.trim()) {
      return [];
    }

    const query = new URLSearchParams();
    query.set('text', params.text.trim());

    if (params.language) query.set('language', params.language);
    if (params.country) query.set('country', params.country);
    if (params.limit) query.set('limit', String(params.limit));

    try {
      const res = await apiClient.get<GeoPlace[]>(`/travel/geo/geocode?${query.toString()}`);
      return res ?? [];
    } catch {
      return [];
    }
  },

  /**
   * Reverse geocode coordinates to structured place via Gateway -> travel-service (/travel/geo/reverse)
   */
  async reverseGeocode(params: GeoReverseParams): Promise<GeoPlace | null> {
    const query = new URLSearchParams();
    query.set('lat', String(params.lat));
    query.set('lon', String(params.lon));
    if (params.language) query.set('language', params.language);

    try {
      return await apiClient.get<GeoPlace>(`/travel/geo/reverse?${query.toString()}`);
    } catch {
      return null;
    }
  },

  /**
   * Fetch nearby POIs (attractions, restaurants, etc.) via Gateway -> travel-service (/travel/geo/places/nearby)
   */
  async getNearbyPlaces(params: NearbyPlacesParams): Promise<NearbyPlace[]> {
    const query = new URLSearchParams();
    query.set('lat', String(params.lat));
    query.set('lon', String(params.lon));

    if (params.radius) query.set('radius', String(params.radius));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.language) query.set('language', params.language);

    if (params.categories) {
      if (Array.isArray(params.categories)) {
        params.categories.forEach((c) => query.append('categories', c));
      } else {
        query.set('categories', params.categories);
      }
    }

    try {
      const res = await apiClient.get<NearbyPlace[]>(`/travel/geo/places/nearby?${query.toString()}`);
      return res ?? [];
    } catch {
      return [];
    }
  },

  /**
   * Constructs the secure, proxied static map URL routed through Gateway -> travel-service (/travel/geo/map/static)
   * The client API key is never exposed.
   */
  getStaticMapUrl(params: StaticMapParams): string {
    const query = new URLSearchParams();
    query.set('lat', String(params.lat));
    query.set('lon', String(params.lon));

    if (params.zoom !== undefined) query.set('zoom', String(params.zoom));
    if (params.width !== undefined) query.set('width', String(params.width));
    if (params.height !== undefined) query.set('height', String(params.height));
    if (params.markers) query.set('markers', params.markers);
    query.set('v', 'fr-labels-1');

    const baseUrl = apiClient.getBaseUrl();
    return `${baseUrl}/travel/geo/map/static?${query.toString()}`;
  },
};
