package com.ahmed.reservationservice.domain.idempotency;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Deterministic cryptographic hashing utilities for idempotency keys and request fingerprints.
 */
@Component
public class IdempotencyHasher {

    private final ObjectMapper canonicalObjectMapper;

    public IdempotencyHasher() {
        this.canonicalObjectMapper = new ObjectMapper();
        // Ensure deterministic JSON key order
        this.canonicalObjectMapper.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
    }

    /**
     * Computes the SHA-256 hex digest of the raw client idempotency key.
     */
    public String hashKey(String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            throw new IdempotencyValidationException("IDEMPOTENCY_KEY_REQUIRED", "Idempotency key is missing or blank");
        }
        return sha256(rawKey.trim());
    }

    /**
     * Computes a deterministic request fingerprint from canonical inputs.
     * Excludes JWT, Authorization, timestamps, and transient transport headers.
     */
    public String computeRequestFingerprint(
            String operation,
            UUID actorUserId,
            String resourceScope,
            Object payload) {

        StringBuilder canonical = new StringBuilder();
        canonical.append("op:").append(operation != null ? operation : "").append("|");
        canonical.append("actor:").append(actorUserId != null ? actorUserId.toString() : "null").append("|");
        canonical.append("scope:").append(resourceScope != null ? resourceScope.trim() : "").append("|");

        if (payload != null) {
            try {
                String serialized = canonicalObjectMapper.writeValueAsString(payload);
                canonical.append("payload:").append(serialized);
            } catch (Exception e) {
                canonical.append("payload:").append(payload.toString());
            }
        } else {
            canonical.append("payload:empty");
        }

        return sha256(canonical.toString());
    }

    /**
     * Computes the SHA-256 hex digest of arbitrary text.
     */
    public String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
