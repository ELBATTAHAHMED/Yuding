package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.UserRecentView;

import java.time.Instant;

public record RecentViewResponse(
        String publicReference,
        String resourceType,
        String resourceReference,
        String title,
        String destination,
        String thumbnailUrl,
        String providerLabel,
        Instant lastViewedAt,
        Instant createdAt
) {
    public static RecentViewResponse from(UserRecentView view) {
        return new RecentViewResponse(
                view.getPublicReference(),
                view.getResourceType(),
                view.getResourceReference(),
                view.getTitle(),
                view.getDestination(),
                view.getThumbnailUrl(),
                view.getProviderLabel(),
                view.getLastViewedAt(),
                view.getCreatedAt()
        );
    }
}
