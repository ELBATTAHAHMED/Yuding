package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.UserFavorite;

import java.math.BigDecimal;
import java.time.Instant;

public record FavoriteResponse(
        String publicReference,
        String resourceType,
        String resourceReference,
        String title,
        String destination,
        String thumbnailUrl,
        String providerLabel,
        BigDecimal priceSnapshot,
        String currencySnapshot,
        Instant capturedAt,
        Instant createdAt
) {
    public static FavoriteResponse from(UserFavorite favorite) {
        return new FavoriteResponse(
                favorite.getPublicReference(),
                favorite.getResourceType(),
                favorite.getResourceReference(),
                favorite.getTitle(),
                favorite.getDestination(),
                favorite.getThumbnailUrl(),
                favorite.getProviderLabel(),
                favorite.getPriceSnapshot(),
                favorite.getCurrencySnapshot(),
                favorite.getCapturedAt(),
                favorite.getCreatedAt()
        );
    }
}
