package com.ahmed.travelservice.provider.impl.pexels;

import com.ahmed.travelservice.config.PexelsProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsSearchResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * Dedicated HTTP client for Pexels REST API v1.
 * Handles authentication, rate-limiting, and error mapping.
 * Ensures the API key is strictly maintained server-side.
 */
@Component
public class PexelsClient {

    private static final Logger log = LoggerFactory.getLogger(PexelsClient.class);
    public static final String PROVIDER_CODE = "PEXELS";

    private final PexelsProperties properties;
    private final RestClient restClient;

    @Autowired
    public PexelsClient(PexelsProperties properties) {
        this(properties, createDefaultRestClient(properties));
    }

    public PexelsClient(PexelsProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient createDefaultRestClient(PexelsProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "Yuding/2.0 (Images; travel-service)")
                .build();
    }

    private void ensureConfigured() throws TravelProviderException {
        if (!properties.isConfigured()) {
            throw TravelProviderException.notConfigured(PROVIDER_CODE, "Pexels API key is not configured.");
        }
    }

    /**
     * Search photos on Pexels (GET /v1/search).
     *
     * @param query search text (e.g. "Marrakech Morocco travel")
     * @param orientation desired photo orientation (e.g. "landscape")
     * @param perPage number of photos to return (1-80)
     * @param page page number (1-indexed)
     * @return PexelsSearchResponse
     * @throws TravelProviderException on network, client, or server errors
     */
    public PexelsSearchResponse searchPhotos(String query, String orientation, int perPage, int page) throws TravelProviderException {
        ensureConfigured();

        if (query == null || query.trim().isBlank()) {
            throw new TravelProviderException(
                    PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Le terme de recherche d'images Pexels ne peut pas être vide."
            );
        }

        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/search")
                            .queryParam("query", query.trim())
                            .queryParam("orientation", orientation != null ? orientation : "landscape")
                            .queryParam("per_page", Math.max(1, Math.min(perPage, 15)))
                            .queryParam("page", Math.max(1, page))
                            .build())
                    .header(HttpHeaders.AUTHORIZATION, properties.getApiKey())
                    .retrieve()
                    .onStatus(status -> status.isSameCodeAs(HttpStatusCode.valueOf(401)) || status.isSameCodeAs(HttpStatusCode.valueOf(403)),
                            (req, resp) -> {
                                log.error("Pexels API authentication failed with status: {}", resp.getStatusCode());
                                throw new TravelProviderException(
                                        PROVIDER_CODE,
                                        ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                                        "Clé d'API Pexels invalide ou non autorisée."
                                );
                            })
                    .onStatus(status -> status.isSameCodeAs(HttpStatusCode.valueOf(429)),
                            (req, resp) -> {
                                log.warn("Pexels API rate limit exceeded");
                                throw new TravelProviderException(
                                        PROVIDER_CODE,
                                        ProviderErrorCode.PROVIDER_RATE_LIMITED,
                                        "Limite de requêtes Pexels atteinte. Veuillez réessayer ultérieurement."
                                );
                            })
                    .onStatus(HttpStatusCode::is5xxServerError,
                            (req, resp) -> {
                                log.error("Pexels API server error: {}", resp.getStatusCode());
                                throw new TravelProviderException(
                                        PROVIDER_CODE,
                                        ProviderErrorCode.PROVIDER_UNAVAILABLE,
                                        "Le service Pexels est temporairement indisponible."
                                );
                            })
                    .body(PexelsSearchResponse.class);
        } catch (ResourceAccessException ex) {
            log.error("Pexels API timeout or connection failure: {}", ex.getMessage());
            throw new TravelProviderException(
                    PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_TIMEOUT,
                    "Délai d'attente dépassé lors de la communication avec Pexels."
            );
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Unexpected error querying Pexels API: {}", ex.getMessage());
            throw new TravelProviderException(
                    PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Erreur inattendue lors de la communication avec Pexels: " + ex.getMessage()
            );
        }
    }
}
