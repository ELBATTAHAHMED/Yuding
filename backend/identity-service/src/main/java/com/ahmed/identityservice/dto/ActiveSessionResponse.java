package com.ahmed.identityservice.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Safe, privacy-conscious representation of an active user session/device.
 * Never exposes raw refresh tokens or token hashes.
 */
public record ActiveSessionResponse(
        UUID sessionId,
        String deviceLabel,
        String ipAddressMasked,
        Instant createdAt,
        Instant lastUsedAt,
        boolean isCurrent
) {}
