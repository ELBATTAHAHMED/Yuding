import { apiClient } from '../lib/api-client.ts';
import type { DestinationImageRequest, DestinationImagesResponse } from '../types/image.types.ts';

/**
 * Service for fetching contextual travel and destination imagery.
 * All traffic routes through API Gateway -> travel-service -> Pexels.
 * API keys remain strictly backend-only.
 */
class ImageService {
  async getDestinationImages(request: DestinationImageRequest): Promise<DestinationImagesResponse> {
    if (!request.city || !request.city.trim()) {
      return {
        destination: '',
        provider: 'PEXELS',
        count: 0,
        images: [],
      };
    }

    const params: Record<string, string> = {
      city: request.city.trim(),
    };

    if (request.country && request.country.trim()) {
      params.country = request.country.trim();
    }
    if (request.countryCode && request.countryCode.trim()) {
      params.countryCode = request.countryCode.trim();
    }
    if (request.limit !== undefined && request.limit > 0) {
      params.limit = request.limit.toString();
    }

    const query = new URLSearchParams(params);
    return apiClient.get<DestinationImagesResponse>(`/travel/images/destination?${query.toString()}`);
  }
}

export const imageService = new ImageService();
