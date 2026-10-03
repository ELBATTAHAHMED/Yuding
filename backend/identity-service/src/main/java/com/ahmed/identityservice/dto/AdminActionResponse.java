package com.ahmed.identityservice.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminActionResponse(
        Long id,
        UUID adminUserId,
        String actionType,
        String targetService,
        String targetEntityType,
        String targetEntityId,
        String reason,
        String metadataJson,
        Instant createdAt
) {
}
