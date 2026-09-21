package com.ahmed.travelservice.provider.impl.hbx;

import com.ahmed.travelservice.config.HBXProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.HBXActivitySearchRequest;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.HBXActivitySearchResponse;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.util.Locale;
import java.util.Map;

/**
 * Dedicated HTTP client for the HBX / Hotelbeds APITUDE Activities API v3.0.
 *
 * Responsibilities:
 * - Authenticates requests using Api-key and server-generated X-Signature.
 * - Enforces connect and read timeouts from HBXProperties.
 * - Maps HTTP and provider-level errors to TravelProviderException.
 * - Protects credentials: API key, secret, and signature inputs are NEVER logged.
 */
@Component
public class HBXActivitiesClient {

    private static final Logger log = LoggerFactory.getLogger(HBXActivitiesClient.class);
    static final String PROVIDER_CODE = "HBX";

    private final HBXProperties.SuiteConfig config;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    private static final Map<String, String> MOROCCO_DESTINATIONS = Map.ofEntries(
            Map.entry("MARRAKECH", "RAK"),
            Map.entry("MARRAKESH", "RAK"),
            Map.entry("CASABLANCA", "CAS"),
            Map.entry("AGADIR", "AGA"),
            Map.entry("FES", "FEZ"),
            Map.entry("FEZ", "FEZ"),
            Map.entry("TANGIER", "TNG"),
            Map.entry("TANGER", "TNG"),
            Map.entry("RABAT", "RBA"),
            Map.entry("OUARZAZATE", "OZZ"),
            Map.entry("ESSAOUIRA", "ESU")
    );

    @org.springframework.beans.factory.annotation.Autowired
    public HBXActivitiesClient(HBXProperties properties) {
        this.config = properties.getActivities();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(config.getConnectTimeoutMs());
        factory.setReadTimeout(config.getReadTimeoutMs());

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(config.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();

        this.objectMapper = new ObjectMapper()
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        boolean hasKey = config.getApiKey() != null && !config.getApiKey().isBlank();
        boolean hasSecret = config.getSecret() != null && !config.getSecret().isBlank();
        log.info("[DIAGNOSTIC] HBXActivitiesClient initialized: apiKey_configured={}, secret_configured={}, baseUrl={}",
                hasKey, hasSecret, config.getBaseUrl());
    }

    // Package-private constructor for MockRestServiceServer tests
    HBXActivitiesClient(HBXProperties.SuiteConfig config, RestClient.Builder builder) {
        this.config = config;
        this.restClient = builder
                .baseUrl(config.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.objectMapper = new ObjectMapper()
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * Resolves human-friendly destination to HBX destination code.
     */
    public static String resolveDestinationCode(String input) {
        if (input == null || input.isBlank()) {
            return "RAK";
        }
        String normalized = input.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() == 3) {
            return normalized;
        }
        for (Map.Entry<String, String> entry : MOROCCO_DESTINATIONS.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return normalized;
    }

    /**
     * Executes an activity search against HBX Activities API v3.0.
     * Endpoint: POST /activities
     */
    public HBXActivitySearchResponse searchActivities(HBXActivitySearchRequest request) throws TravelProviderException {
        String apiKey = config.getApiKey();
        String secret = config.getSecret();

        if (apiKey == null || apiKey.isBlank() || secret == null || secret.isBlank()) {
            log.warn("HBXActivitiesClient: HBX_ACTIVITIES_API_KEY or HBX_ACTIVITIES_SECRET is not configured.");
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                    "Le service d'activités HBX n'est pas configuré avec des identifiants valides.");
        }

        String signature = HBXAuthUtils.generateSignature(apiKey, secret);

        try {
            return restClient.post()
                    .uri("/activities")
                    .header("Api-key", apiKey)
                    .header("X-Signature", signature)
                    .body(request)
                    .exchange((req, res) -> {
                        HttpStatusCode status = res.getStatusCode();
                        byte[] bodyBytes = res.getBody().readAllBytes();

                        if (status.is2xxSuccessful()) {
                            if (bodyBytes.length == 0) {
                                return new HBXActivitySearchResponse();
                            }
                            return objectMapper.readValue(bodyBytes, HBXActivitySearchResponse.class);
                        }

                        String errorJson = new String(bodyBytes);
                        log.warn("HBX Activities API returned HTTP {}: {}", status.value(), errorJson);

                        if (status.value() == 400) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                                    "Requête d'activités invalide auprès d'HBX: " + extractErrorMessage(errorJson));
                        } else if (status.value() == 401 || status.value() == 403) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                                    "Échec d'authentification HBX Activities: identifiants ou signature invalides.");
                        } else if (status.value() == 429) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_RATE_LIMITED,
                                    "Limite de requêtes HBX Activities atteinte. Veuillez réessayer ultérieurement.");
                        } else if (status.is5xxServerError()) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_UNAVAILABLE,
                                    "Le service HBX Activities est temporairement indisponible (HTTP " + status.value() + ").");
                        } else {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                                    "Erreur HBX Activities inattendue: HTTP " + status.value());
                        }
                    });
        } catch (TravelProviderException e) {
            throw e;
        } catch (ResourceAccessException e) {
            log.error("HBX Activities network timeout or connection failure: {}", e.getMessage());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_TIMEOUT,
                    "Délai d'attente dépassé lors de la communication avec HBX Activities.");
        } catch (Exception e) {
            log.error("HBX Activities unexpected client error: {}", e.getMessage(), e);
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Réponse invalide reçue de HBX Activities: " + e.getMessage());
        }
    }

    private String extractErrorMessage(String errorJson) {
        try {
            HBXActivitySearchResponse err = objectMapper.readValue(errorJson, HBXActivitySearchResponse.class);
            if (err.getError() != null && err.getError().getMessage() != null) {
                return err.getError().getMessage();
            }
        } catch (Exception ignored) {
        }
        return "Format de requête rejeté";
    }
}
