import { apiClient } from '../lib/api-client.ts';
import type {
  FavoriteItem,
  FavoriteRequest,
  SavedTripItem,
  SavedTripRequest,
  RecentSearchItem,
  RecentSearchRequest,
  RecentViewItem,
  RecentViewRequest,
} from '../types/library.types.ts';

export const libraryService = {
  // Favorites
  async getFavorites(): Promise<FavoriteItem[]> {
    if (!apiClient.getAccessToken()) return [];
    const res = await apiClient.get<FavoriteItem[]>('/api/account/favorites', true);
    return res ?? [];
  },

  async addFavorite(request: FavoriteRequest): Promise<FavoriteItem> {
    const res = await apiClient.post<FavoriteItem>('/api/account/favorites', request, true);
    return res;
  },

  async removeFavorite(reference: string): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete(`/api/account/favorites/${encodeURIComponent(reference)}`, true);
  },

  async removeFavoriteByResource(type: string, resourceRef: string): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete(
      `/api/account/favorites?type=${encodeURIComponent(type)}&ref=${encodeURIComponent(resourceRef)}`,
      true
    );
  },

  // Saved Trips
  async getSavedTrips(): Promise<SavedTripItem[]> {
    if (!apiClient.getAccessToken()) return [];
    const res = await apiClient.get<SavedTripItem[]>('/api/account/saved-trips', true);
    return res ?? [];
  },

  async saveTrip(request: SavedTripRequest): Promise<SavedTripItem> {
    const res = await apiClient.post<SavedTripItem>('/api/account/saved-trips', request, true);
    return res;
  },

  async unsaveTrip(reference: string): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete(`/api/account/saved-trips/${encodeURIComponent(reference)}`, true);
  },

  // Recent Searches
  async getRecentSearches(): Promise<RecentSearchItem[]> {
    if (!apiClient.getAccessToken()) return [];
    const res = await apiClient.get<RecentSearchItem[]>('/api/account/recent-searches', true);
    return res ?? [];
  },

  async recordRecentSearch(request: RecentSearchRequest): Promise<RecentSearchItem | null> {
    if (!apiClient.getAccessToken()) return null;
    const res = await apiClient.post<RecentSearchItem>('/api/account/recent-searches', request, true);
    return res;
  },

  async deleteRecentSearch(reference: string): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete(`/api/account/recent-searches/${encodeURIComponent(reference)}`, true);
  },

  async clearRecentSearches(): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete('/api/account/recent-searches', true);
  },

  // Recently Viewed
  async getRecentViews(): Promise<RecentViewItem[]> {
    if (!apiClient.getAccessToken()) return [];
    const res = await apiClient.get<RecentViewItem[]>('/api/account/recent-views', true);
    return res ?? [];
  },

  async recordRecentView(request: RecentViewRequest): Promise<RecentViewItem | null> {
    if (!apiClient.getAccessToken()) return null;
    const res = await apiClient.post<RecentViewItem>('/api/account/recent-views', request, true);
    return res;
  },

  async deleteRecentView(reference: string): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete(`/api/account/recent-views/${encodeURIComponent(reference)}`, true);
  },

  async clearRecentViews(): Promise<void> {
    if (!apiClient.getAccessToken()) return;
    await apiClient.delete('/api/account/recent-views', true);
  },
};
