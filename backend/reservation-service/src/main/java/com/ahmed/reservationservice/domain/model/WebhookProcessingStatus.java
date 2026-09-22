package com.ahmed.reservationservice.domain.model;

/**
 * Processing status for inbound payment webhook events.
 */
public enum WebhookProcessingStatus {
    PENDING,
    PROCESSED,
    DUPLICATE,
    IGNORED,
    UNMATCHED,
    FAILED
}
