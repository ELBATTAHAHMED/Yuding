package com.ahmed.travelservice.cache;

import com.fasterxml.jackson.core.type.TypeReference;

import java.time.Duration;
import java.util.Optional;
import java.util.function.Supplier;

/**
 * Centralized, provider-aware External API Cache abstraction for Yuding V2.
 *
 * Responsibilities:
 * - Read/write provider responses to Redis with explicit TTLs
 * - Safe JSON serialization & deserialization preserving BigDecimal and date models
 * - Request stampede mitigation via in-flight single-flight execution
 * - Fail-safe degradation: Redis outages log warnings without disrupting live travel search
 */
public interface ExternalApiCache {

    /**
     * Reads a cached value by key for a non-generic class type.
     */
    <T> Optional<T> get(String key, Class<T> clazz);

    /**
     * Reads a cached value by key using a Jackson TypeReference (e.g. for parameterized lists).
     */
    <T> Optional<T> get(String key, TypeReference<T> typeRef);

    /**
     * Writes a value to Redis with the specified time-to-live.
     * Fails silently/safely if Redis is unreachable.
     */
    <T> void put(String key, T value, Duration ttl);

    /**
     * Retrieves from cache if present; otherwise invokes the loader, caches the result,
     * and returns it. Provides concurrent stampede protection for identical missing keys.
     */
    <T> T getOrLoad(String key, Class<T> clazz, Duration ttl, Supplier<T> loader);

    /**
     * Retrieves from cache if present; otherwise invokes the loader, caches the result,
     * and returns it. Provides concurrent stampede protection for identical missing keys.
     */
    <T> T getOrLoad(String key, TypeReference<T> typeRef, Duration ttl, Supplier<T> loader);

    /**
     * Evicts a key from the cache.
     */
    void evict(String key);

    /**
     * Checks if the backing Redis instance is reachable and healthy.
     */
    boolean isHealthy();

    /**
     * Indicates whether caching is currently enabled in configuration.
     */
    boolean isEnabled();
}
