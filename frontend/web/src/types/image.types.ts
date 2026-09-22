/**
 * Provenance-aware Image Asset and Destination Imagery Types.
 * Strictly distinguishes contextual stock photos from authoritative provider entity photos.
 */

export type ImageSourceType =
  | 'STOCK_DESTINATION'
  | 'PROVIDER_ENTITY'
  | 'YUDING_CURATED'
  | 'PLACEHOLDER';

export type ImageRole =
  | 'DESTINATION_HERO'
  | 'DESTINATION_GALLERY'
  | 'HOTEL'
  | 'ROOM'
  | 'ACTIVITY'
  | 'OTHER';

export interface ImageAsset {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  altText: string;
  sourceType: ImageSourceType;
  sourceProvider: string;
  sourceAssetId?: string;
  sourcePageUrl?: string;
  photographerName?: string;
  photographerUrl?: string;
  attributionText?: string;
  attributionUrl?: string;
  role: ImageRole;
  /**
   * Critical image truth invariant:
   * - true: image genuinely represents the specific property/tour
   * - false: image is contextual/stock travel atmosphere (e.g. Pexels city photo)
   */
  representsEntity: boolean;
}

export interface DestinationImageRequest {
  city: string;
  country?: string;
  countryCode?: string;
  limit?: number;
}

export interface DestinationImagesResponse {
  destination: string;
  provider: string;
  count: number;
  images: ImageAsset[];
}
