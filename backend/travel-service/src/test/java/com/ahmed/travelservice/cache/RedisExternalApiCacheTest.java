package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.currency.ExchangeRateQuote;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("RedisExternalApiCache Resilience, Serialization, and Anti-Stampede Tests")
class RedisExternalApiCacheTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    private ObjectMapper objectMapper;
    private ExternalApiCacheProperties properties;
    private RedisExternalApiCache cache;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        properties = new ExternalApiCacheProperties();
        properties.setEnabled(true);
        properties.getTtl().setCurrency(Duration.ofHours(24));
        properties.getTtl().setEmptyResult(Duration.ofSeconds(30));

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        cache = new RedisExternalApiCache(redisTemplate, objectMapper, properties);
    }

    @Test
    @DisplayName("Cache Miss: calls supplier, writes to Redis with configured TTL, and returns loaded value")
    void testCacheMissAndWrite() {
        String key = "yuding:v2:currency:frankfurter:v1:EUR:MAD";
        when(valueOperations.get(key)).thenReturn(null);

        AtomicInteger callCount = new AtomicInteger(0);
        ExchangeRateQuote expected = new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.8542"), LocalDate.of(2026, 9, 21), "FRANKFURTER");

        ExchangeRateQuote actual = cache.getOrLoad(key, ExchangeRateQuote.class, Duration.ofHours(24), () -> {
            callCount.incrementAndGet();
            return expected;
        });

        assertEquals(1, callCount.get());
        assertEquals(expected, actual);
        verify(valueOperations, times(1)).set(eq(key), anyString(), eq(Duration.ofHours(24)));
    }

    @Test
    @DisplayName("Cache Hit: returns value from Redis without calling the supplier")
    void testCacheHit() throws Exception {
        String key = "yuding:v2:currency:frankfurter:v1:EUR:MAD";
        ExchangeRateQuote cachedQuote = new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.8542"), LocalDate.of(2026, 9, 21), "FRANKFURTER");
        String json = objectMapper.writeValueAsString(cachedQuote);

        when(valueOperations.get(key)).thenReturn(json);

        AtomicInteger callCount = new AtomicInteger(0);
        ExchangeRateQuote actual = cache.getOrLoad(key, ExchangeRateQuote.class, Duration.ofHours(24), () -> {
            callCount.incrementAndGet();
            return new ExchangeRateQuote("EUR", "MAD", BigDecimal.ONE, LocalDate.now(), "OTHER");
        });

        assertEquals(0, callCount.get());
        assertEquals(cachedQuote, actual);
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("Redis Failure on Read: gracefully falls back to supplier call without throwing")
    void testRedisReadFailureFallback() {
        String key = "yuding:v2:currency:frankfurter:v1:EUR:MAD";
        when(valueOperations.get(key)).thenThrow(new RedisConnectionFailureException("Redis connection refused on 6379"));

        AtomicInteger callCount = new AtomicInteger(0);
        ExchangeRateQuote fallbackQuote = new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.8542"), LocalDate.now(), "FRANKFURTER");

        ExchangeRateQuote actual = cache.getOrLoad(key, ExchangeRateQuote.class, Duration.ofHours(24), () -> {
            callCount.incrementAndGet();
            return fallbackQuote;
        });

        assertEquals(1, callCount.get());
        assertEquals(fallbackQuote, actual);
    }

    @Test
    @DisplayName("Redis Failure on Write: returns loaded supplier value without failing the request")
    void testRedisWriteFailureSafe() {
        String key = "yuding:v2:currency:frankfurter:v1:EUR:MAD";
        when(valueOperations.get(key)).thenReturn(null);
        doThrow(new RedisConnectionFailureException("Redis write timeout")).when(valueOperations).set(anyString(), anyString(), any(Duration.class));

        ExchangeRateQuote quote = new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.8542"), LocalDate.now(), "FRANKFURTER");

        ExchangeRateQuote actual = cache.getOrLoad(key, ExchangeRateQuote.class, Duration.ofHours(24), () -> quote);

        assertEquals(quote, actual);
    }

    @Test
    @DisplayName("Cache Disabled: bypasses Redis read and write completely")
    void testCacheDisabled() {
        properties.setEnabled(false);
        String key = "yuding:v2:currency:frankfurter:v1:EUR:MAD";

        AtomicInteger callCount = new AtomicInteger(0);
        ExchangeRateQuote quote = new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.8542"), LocalDate.now(), "FRANKFURTER");

        ExchangeRateQuote actual = cache.getOrLoad(key, ExchangeRateQuote.class, Duration.ofHours(24), () -> {
            callCount.incrementAndGet();
            return quote;
        });

        assertEquals(1, callCount.get());
        assertEquals(quote, actual);
        verify(valueOperations, never()).get(anyString());
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("Anti-Stampede: 10 concurrent requests for the same missing key trigger supplier exactly once")
    void testAntiStampedeProtection() throws Exception {
        String key = "yuding:v2:weather:openmeteo:v1:31.6295:-7.9811:d7";
        when(valueOperations.get(key)).thenReturn(null);

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CyclicBarrier barrier = new CyclicBarrier(threadCount);
        AtomicInteger supplierExecutions = new AtomicInteger(0);

        List<Future<String>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                barrier.await(); // Synchronize thread start
                return cache.getOrLoad(key, String.class, Duration.ofMinutes(15), () -> {
                    supplierExecutions.incrementAndGet();
                    try {
                        Thread.sleep(50); // Simulate upstream network latency
                    } catch (InterruptedException ignored) {}
                    return "weather-data-result";
                });
            }));
        }

        for (Future<String> f : futures) {
            assertEquals("weather-data-result", f.get(5, TimeUnit.SECONDS));
        }
        executor.shutdown();

        // Exactly 1 execution of the expensive supplier loader!
        assertEquals(1, supplierExecutions.get());
    }

    @Test
    @DisplayName("Provider Errors are NEVER cached in Redis")
    void testProviderErrorsNotCached() {
        String key = "yuding:v2:search:hotels:nuitee:v1:test";
        when(valueOperations.get(key)).thenReturn(null);

        assertThrows(TravelProviderException.class, () ->
                cache.getOrLoad(key, String.class, Duration.ofSeconds(120), () -> {
                    throw new TravelProviderException("NUITEE", ProviderErrorCode.PROVIDER_TIMEOUT, "Read timed out");
                })
        );

        // Verify write was NEVER called
        verify(valueOperations, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("Negative Caching: Valid successful 200 empty collections are cached with emptyResultTtl")
    void testEmptyResultNegativeCaching() {
        String key = "yuding:v2:search:flights:scrappa:v1:empty";
        when(valueOperations.get(key)).thenReturn(null);

        List<String> emptyResult = cache.getOrLoad(key, new TypeReference<List<String>>() {}, Duration.ofSeconds(60),
                Collections::emptyList);

        assertTrue(emptyResult.isEmpty());
        // Verify set was called with emptyResultTtl (30s), NOT the base 60s
        verify(valueOperations, times(1)).set(eq(key), eq("[]"), eq(Duration.ofSeconds(30)));
    }

    @Test
    @DisplayName("BigDecimal & Date Preservation: values survive serialization without floating-point conversion")
    void testBigDecimalPreservation() throws Exception {
        BigDecimal exactRate = new BigDecimal("10.8542918273645");
        ExchangeRateQuote quote = new ExchangeRateQuote("EUR", "MAD", exactRate, LocalDate.of(2026, 9, 21), "FRANKFURTER");

        String json = objectMapper.writeValueAsString(quote);
        when(valueOperations.get("key")).thenReturn(json);

        Optional<ExchangeRateQuote> deserialized = cache.get("key", ExchangeRateQuote.class);

        assertTrue(deserialized.isPresent());
        assertEquals(exactRate, deserialized.get().rate());
        assertEquals(LocalDate.of(2026, 9, 21), deserialized.get().rateDate());
    }
}
