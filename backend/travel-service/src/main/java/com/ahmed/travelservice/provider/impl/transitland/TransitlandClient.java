package com.ahmed.travelservice.provider.impl.transitland;

import com.ahmed.travelservice.config.TransitlandProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitland.dto.TransitlandModels;
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

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;

/**
 * Dedicated HTTP client for the Transitland REST API v2.
 * Responsibilities:
 * - Authenticates requests via 'apikey' header without logging the key.
 * - Enforces connect and read timeouts.
 * - Handles rate limits (429), auth failures (401/403), timeouts, and 5xx errors.
 */
@Component
public class TransitlandClient {

    private static final Logger log = LoggerFactory.getLogger(TransitlandClient.class);
    static final String PROVIDER_CODE = "TRANSITLAND";

    private final TransitlandProperties properties;
    private final RestClient restClient;

    @Autowired
    public TransitlandClient(TransitlandProperties properties) {
        this(properties, createDefaultRestClient(properties));
    }

    public TransitlandClient(TransitlandProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient createDefaultRestClient(TransitlandProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Inspects feed metadata to obtain active calendar validity dates.
     */
    public TransitlandModels.FeedVersion getFeedVersion(String feedOnestopId) throws TravelProviderException {
        try {
            TransitlandModels.FeedResponse response = restClient.get()
                    .uri("/feeds/{feedKey}", feedOnestopId)
                    .headers(this::applyAuthHeaders)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(TransitlandModels.FeedResponse.class);

            if (response != null && response.getFeeds() != null && !response.getFeeds().isEmpty()) {
                TransitlandModels.FeedItem feedItem = response.getFeeds().getFirst();
                if (feedItem.getFeedVersions() != null && !feedItem.getFeedVersions().isEmpty()) {
                    return feedItem.getFeedVersions().getFirst();
                }
            }
            return null;
        } catch (ResourceAccessException ex) {
            log.error("TransitlandClient: Connection timeout while querying feed '{}'", feedOnestopId);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Transitland connection timed out: " + ex.getMessage());
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("TransitlandClient: Unexpected error querying feed '{}'", feedOnestopId, ex);
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to parse Transitland feed metadata: " + ex.getMessage(), ex);
        }
    }

    /**
     * Retrieves all railway stations belonging to the target feed.
     */
    public List<TransitlandModels.StopItem> getStops(String feedOnestopId) throws TravelProviderException {
        try {
            TransitlandModels.StopsResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/stops")
                            .queryParam("feed_onestop_id", feedOnestopId)
                            .queryParam("limit", 100)
                            .build())
                    .headers(this::applyAuthHeaders)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(TransitlandModels.StopsResponse.class);

            if (response != null && response.getStops() != null) {
                return response.getStops();
            }
            return Collections.emptyList();
        } catch (ResourceAccessException ex) {
            log.error("TransitlandClient: Timeout while querying stops for feed '{}'", feedOnestopId);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Transitland stops query timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("TransitlandClient: Error querying stops for feed '{}'", feedOnestopId, ex);
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to fetch stops from Transitland: " + ex.getMessage(), ex);
        }
    }

    /**
     * Retrieves departures from an origin stop without date fallback.
     */
    public List<TransitlandModels.DepartureItem> getStopDepartures(String stopKey, LocalDate date) throws TravelProviderException {
        try {
            TransitlandModels.StopDeparturesResponse response = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/stops/{stopKey}/departures")
                            .queryParam("date", date != null ? date.toString() : "")
                            .queryParam("use_service_window", "false")
                            .queryParam("limit", 100)
                            .build(stopKey))
                    .headers(this::applyAuthHeaders)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(TransitlandModels.StopDeparturesResponse.class);

            if (response != null && response.getStops() != null && !response.getStops().isEmpty()) {
                TransitlandModels.StopDeparturesItem item = response.getStops().getFirst();
                if (item.getDepartures() != null) {
                    return item.getDepartures();
                }
            }
            return Collections.emptyList();
        } catch (ResourceAccessException ex) {
            log.error("TransitlandClient: Timeout while querying departures for stop '{}'", stopKey);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Transitland departures query timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("TransitlandClient: Error querying departures for stop '{}'", stopKey, ex);
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to fetch departures from Transitland: " + ex.getMessage(), ex);
        }
    }

    /**
     * Retrieves full trip detail including intermediate stop times sequence.
     */
    public TransitlandModels.TripDetail getTripDetail(String routeKey, Long tripRecordId) throws TravelProviderException {
        try {
            TransitlandModels.TripsResponse response = restClient.get()
                    .uri("/routes/{routeKey}/trips/{id}", routeKey, tripRecordId)
                    .headers(this::applyAuthHeaders)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(TransitlandModels.TripsResponse.class);

            if (response != null && response.getTrips() != null && !response.getTrips().isEmpty()) {
                return response.getTrips().getFirst();
            }
            return null;
        } catch (ResourceAccessException ex) {
            log.error("TransitlandClient: Timeout while querying trip '{}'", tripRecordId);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Transitland trip query timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("TransitlandClient: Error querying trip '{}'", tripRecordId, ex);
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to fetch trip detail from Transitland: " + ex.getMessage(), ex);
        }
    }

    private void applyAuthHeaders(HttpHeaders headers) {
        String key = properties.getApiKey();
        if (key != null && !key.isBlank()) {
            headers.set("apikey", key.trim());
        }
    }

    private void handleHttpError(HttpStatusCode status) throws TravelProviderException {
        int code = status.value();
        if (code == 401 || code == 403) {
            throw TravelProviderException.authenticationFailed(PROVIDER_CODE,
                    "Transitland API authentication failed (HTTP " + code + "). Please verify TRANSITLAND_API_KEY.");
        } else if (code == 429) {
            throw TravelProviderException.rateLimitExceeded(PROVIDER_CODE,
                    "Transitland rate limit exceeded (HTTP 429). Please retry after quota replenishment.");
        } else if (code >= 500) {
            throw TravelProviderException.providerUnavailable(PROVIDER_CODE,
                    "Transitland API service error (HTTP " + code + ").");
        } else {
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_UNAVAILABLE,
                    "Transitland API returned error status HTTP " + code);
        }
    }
}
