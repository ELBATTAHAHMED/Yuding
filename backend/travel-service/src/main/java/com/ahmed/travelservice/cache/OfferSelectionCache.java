package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.dto.response.ResolvedOfferDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Server-side cache for short-lived offer selection references.
 * Backed by Redis with fail-safe in-memory fallback.
 */
@Component
@Slf4j
public class OfferSelectionCache {

    private static final String KEY_PREFIX = "yuding:v2:selection:";
    private static final Duration DEFAULT_SELECTION_TTL = Duration.ofMinutes(15);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    // In-memory fallback / local cache
    private final Map<String, InMemoryEntry> localFallback = new ConcurrentHashMap<>();

    @Autowired
    public OfferSelectionCache(@Autowired(required = false) StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    public void put(String selectionRef, ResolvedOfferDto offer) {
        put(selectionRef, offer, DEFAULT_SELECTION_TTL);
    }

    public void put(String selectionRef, ResolvedOfferDto offer, Duration ttl) {
        if (selectionRef == null || offer == null) {
            return;
        }
        Duration effectiveTtl = ttl != null ? ttl : DEFAULT_SELECTION_TTL;
        Instant expiresAt = Instant.now().plus(effectiveTtl);
        offer.setSnapshotExpiresAt(expiresAt);

        // Save to Redis if available
        if (redisTemplate != null) {
            try {
                String json = objectMapper.writeValueAsString(offer);
                redisTemplate.opsForValue().set(KEY_PREFIX + selectionRef, json, effectiveTtl);
            } catch (Exception e) {
                log.warn("Failed to store selection reference in Redis, saving to local fallback: {}", e.getMessage());
            }
        }

        // Always save to in-memory fallback
        localFallback.put(selectionRef, new InMemoryEntry(offer, expiresAt));
    }

    public Optional<ResolvedOfferDto> get(String selectionRef) {
        if (selectionRef == null || selectionRef.isBlank()) {
            return Optional.empty();
        }

        // Check Redis first
        if (redisTemplate != null) {
            try {
                String json = redisTemplate.opsForValue().get(KEY_PREFIX + selectionRef);
                if (json != null && !json.isBlank()) {
                    ResolvedOfferDto offer = objectMapper.readValue(json, ResolvedOfferDto.class);
                    return Optional.ofNullable(offer);
                }
            } catch (Exception e) {
                log.warn("Failed to read selection reference from Redis, checking local fallback: {}", e.getMessage());
            }
        }

        // Check local fallback
        InMemoryEntry entry = localFallback.get(selectionRef);
        if (entry != null) {
            if (Instant.now().isBefore(entry.expiresAt)) {
                return Optional.of(entry.offer);
            } else {
                localFallback.remove(selectionRef);
            }
        }

        return Optional.empty();
    }

    public void remove(String selectionRef) {
        if (selectionRef == null) return;
        if (redisTemplate != null) {
            try {
                redisTemplate.delete(KEY_PREFIX + selectionRef);
            } catch (Exception e) {
                log.warn("Failed to delete selection reference from Redis: {}", e.getMessage());
            }
        }
        localFallback.remove(selectionRef);
    }

    private record InMemoryEntry(ResolvedOfferDto offer, Instant expiresAt) {}
}
