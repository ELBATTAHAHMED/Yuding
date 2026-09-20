package com.ahmed.identityservice.dto;

import java.time.Instant;

/**
 * Privacy-conscious user security audit event.
 */
public record SecurityEventResponse(
        Long id,
        String eventType,
        String ipAddressMasked,
        String deviceLabel,
        String failureReason,
        int riskScore,
        Instant createdAt
) {}
