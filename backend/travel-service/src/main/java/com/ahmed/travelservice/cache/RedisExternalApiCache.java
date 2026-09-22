package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.dto.response.SearchResponse;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.Collection;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Supplier;

/**
 * Production Redis-backed ExternalApiCache implementation.
 *
 * Core Guarantees:
 * 1. Stampede Protection: In-flight deduplication coalesces concurrent misses for the same key into a single supplier call.
 * 2. Fail-Safe: Catches Redis connection/serialization errors and gracefully degrades to provider calls.
 * 3. JSON Precision: Jackson ObjectMapper preserves BigDecimal and Java 8 date/time types.
 * 4. Negative Caching: Caches valid empty responses with a short TTL (emptyResultTtl). Provider errors are NEVER cached.
 */
@Component
@RequiredArgsConstructor
public class RedisExternalApiCache implements ExternalApiCache {

    private static final Logger log = LoggerFactory.getLogger(RedisExternalApiCache.class);

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final ExternalApiCacheProperties properties;

    private final ConcurrentHashMap<String, CompletableFuture<Object>> inFlight = new ConcurrentHashMap<>();

    @Override
    public boolean isEnabled() {
        return properties.isEnabled();
    }

    @Override
    public <T> Optional<T> get(String key, Class<T> clazz) {
        if (!properties.isEnabled()) {
            return Optional.empty();
        }
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            T value = objectMapper.readValue(json, clazz);
            return Optional.ofNullable(value);
        } catch (Exception ex) {
            log.warn("ExternalApiCache: Redis read failed for key '{}': {}. Falling back to provider.", key, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public <T> Optional<T> get(String key, TypeReference<T> typeRef) {
        if (!properties.isEnabled()) {
            return Optional.empty();
        }
        try {
            String json = redisTemplate.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return Optional.empty();
            }
            T value = objectMapper.readValue(json, typeRef);
            return Optional.ofNullable(value);
        } catch (Exception ex) {
            log.warn("ExternalApiCache: Redis read failed for key '{}': {}. Falling back to provider.", key, ex.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public <T> void put(String key, T value, Duration ttl) {
        if (!properties.isEnabled() || value == null) {
            return;
        }
        try {
            String json = objectMapper.writeValueAsString(value);
            Duration effectiveTtl = (ttl != null && !ttl.isZero() && !ttl.isNegative())
                    ? ttl
                    : properties.getTtl().getEmptyResult();
            redisTemplate.opsForValue().set(key, json, effectiveTtl);
            log.debug("ExternalApiCache: WRITE key={}, ttl={}s", key, effectiveTtl.getSeconds());
        } catch (Exception ex) {
            log.warn("ExternalApiCache: Redis write failed for key '{}': {}. Proceeding without caching.", key, ex.getMessage());
        }
    }

    @Override
    public <T> T getOrLoad(String key, Class<T> clazz, Duration ttl, Supplier<T> loader) {
        if (!properties.isEnabled()) {
            return loader.get();
        }

        Optional<T> cached = get(key, clazz);
        if (cached.isPresent()) {
            log.debug("ExternalApiCache: HIT key={}", key);
            return cached.get();
        }

        return executeWithStampedeProtection(key, ttl, loader);
    }

    @Override
    public <T> T getOrLoad(String key, TypeReference<T> typeRef, Duration ttl, Supplier<T> loader) {
        if (!properties.isEnabled()) {
            return loader.get();
        }

        Optional<T> cached = get(key, typeRef);
        if (cached.isPresent()) {
            log.debug("ExternalApiCache: HIT key={}", key);
            return cached.get();
        }

        return executeWithStampedeProtection(key, ttl, loader);
    }

    @SuppressWarnings("unchecked")
    private <T> T executeWithStampedeProtection(String key, Duration ttl, Supplier<T> loader) {
        CompletableFuture<Object> future = new CompletableFuture<>();
        CompletableFuture<Object> existing = inFlight.putIfAbsent(key, future);

        if (existing != null) {
            // Another thread is already computing this key; join its future
            try {
                return (T) existing.join();
            } catch (CompletionException ce) {
                Throwable cause = ce.getCause();
                if (cause instanceof RuntimeException re) throw re;
                if (cause instanceof Error err) throw err;
                throw new RuntimeException(cause);
            }
        }

        // Current thread won the race to execute the loader
        try {
            log.debug("ExternalApiCache: MISS key={}, loading from provider", key);
            T loaded = loader.get();
            if (loaded != null) {
                Duration targetTtl = isEmptyResult(loaded)
                        ? properties.getTtl().getEmptyResult()
                        : ttl;
                put(key, loaded, targetTtl);
            }
            future.complete(loaded);
            return loaded;
        } catch (Throwable t) {
            // Provider errors (e.g. TravelProviderException, 401, 5xx) must NOT be cached
            future.completeExceptionally(t);
            if (t instanceof RuntimeException re) throw re;
            if (t instanceof Error err) throw err;
            throw new RuntimeException(t);
        } finally {
            inFlight.remove(key, future);
        }
    }

    @Override
    public void evict(String key) {
        try {
            redisTemplate.delete(key);
            log.debug("ExternalApiCache: EVICT key={}", key);
        } catch (Exception ex) {
            log.warn("ExternalApiCache: Redis eviction failed for key '{}': {}", key, ex.getMessage());
        }
    }

    @Override
    public boolean isHealthy() {
        try {
            if (redisTemplate == null) return false;
            RedisConnectionFactory factory = redisTemplate.getConnectionFactory();
            if (factory == null) return false;
            try (RedisConnection connection = factory.getConnection()) {
                String ping = connection.ping();
                return "PONG".equalsIgnoreCase(ping);
            }
        } catch (Exception ex) {
            log.warn("ExternalApiCache: Redis health check failed: {}", ex.getMessage());
            return false;
        }
    }

    private boolean isEmptyResult(Object obj) {
        if (obj == null) return true;
        if (obj instanceof Collection<?> coll) {
            return coll.isEmpty();
        }
        if (obj instanceof DestinationImagesResponseDto imgDto) {
            return imgDto.getCount() == 0 || imgDto.getImages() == null || imgDto.getImages().isEmpty();
        }
        if (obj instanceof SearchResponse<?> sr) {
            Object data = sr.getResults();
            if (data == null) return true;
            if (data instanceof Collection<?> c) return c.isEmpty();
        }
        return false;
    }
}
