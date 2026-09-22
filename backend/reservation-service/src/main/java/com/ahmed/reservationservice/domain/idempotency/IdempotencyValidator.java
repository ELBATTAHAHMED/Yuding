package com.ahmed.reservationservice.domain.idempotency;

import org.springframework.stereotype.Component;

/**
 * Validates incoming Idempotency-Key headers according to safety rules.
 */
@Component
public class IdempotencyValidator {

    private static final int MAX_KEY_LENGTH = 255;

    public void validate(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new IdempotencyValidationException(
                    "IDEMPOTENCY_KEY_REQUIRED",
                    "Idempotency-Key header is required for this mutation."
            );
        }

        String trimmed = rawKey.trim();
        if (trimmed.length() > MAX_KEY_LENGTH) {
            throw new IdempotencyValidationException(
                    "INVALID_IDEMPOTENCY_KEY",
                    "Idempotency-Key exceeds maximum allowed length of " + MAX_KEY_LENGTH + " characters."
            );
        }

        for (int i = 0; i < trimmed.length(); i++) {
            char c = trimmed.charAt(i);
            if (c <= 31 || c == 127) {
                throw new IdempotencyValidationException(
                        "INVALID_IDEMPOTENCY_KEY",
                        "Idempotency-Key contains invalid control characters."
                );
            }
        }
    }
}
