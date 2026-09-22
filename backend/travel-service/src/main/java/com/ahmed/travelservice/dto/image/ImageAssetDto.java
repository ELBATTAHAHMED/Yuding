package com.ahmed.travelservice.dto.image;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Provider-neutral, provenance-aware image asset model.
 * Guarantees every image in Yuding carries its explicit origin, source provider,
 * and entity-authenticity flag to prevent misrepresentation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ImageAssetDto {

    /** Unique internal asset ID (e.g. "pexels-123456" or "nuitee-hotel-lp123"). */
    private String id;

    /** Public image CDN URL (must be HTTPS). */
    private String url;

    /** Optional smaller thumbnail URL for preview/grids. */
    private String thumbnailUrl;

    /** Width in pixels if available. */
    private Integer width;

    /** Height in pixels if available. */
    private Integer height;

    /** Accessible alt text. */
    private String altText;

    /** Provenance category (STOCK_DESTINATION, PROVIDER_ENTITY, YUDING_CURATED, PLACEHOLDER). */
    private ImageSourceType sourceType;

    /** Identifier of the upstream source provider ("PEXELS", "NUITEE", "HBX", "SYSTEM"). */
    private String sourceProvider;

    /** Upstream provider-assigned asset ID if available. */
    private String sourceAssetId;

    /** Upstream canonical page URL (e.g. Pexels photo page). */
    private String sourcePageUrl;

    /** Name of the photographer or creator. */
    private String photographerName;

    /** Direct URL to photographer profile. */
    private String photographerUrl;

    /** Human-readable attribution string (e.g. "Photo by Lukas on Pexels"). */
    private String attributionText;

    /** Hyperlink for attribution. */
    private String attributionUrl;

    /** Semantic role of this image. */
    private ImageRole role;

    /**
     * Critical truth flag:
     * - true: image genuinely depicts the specific entity (e.g. Hotel Atlas photo from Nuitee).
     * - false: image is contextual/stock travel atmosphere (e.g. Marrakech view from Pexels).
     */
    private boolean representsEntity;
}
