package com.ahmed.travelservice.provider.impl.transitous;

import com.ahmed.travelservice.config.TransitousProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitous.model.TransitousModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

import java.util.Collections;
import java.util.List;

/**
 * Dedicated HTTP client for the Transitous global public transport routing API (MOTIS v2).
 * Note: Transitous does not require an API key for normal public use.
 * A descriptive User-Agent is required per Transitous API usage policy.
 */
@Component
public class TransitousClient {

    private static final Logger log = LoggerFactory.getLogger(TransitousClient.class);
    public static final String PROVIDER_CODE = "TRANSITOUS";

    private final TransitousProperties properties;
    private final RestClient restClient;

    @Autowired
    public TransitousClient(TransitousProperties properties) {
        this(properties, createDefaultRestClient(properties));
    }

    public TransitousClient(TransitousProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient createDefaultRestClient(TransitousProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, properties.getUserAgent())
                .build();
    }

    /**
     * Searches places and transit stops globally using the Transitous geocoding service (/v1/geocode).
     *
     * @param text search query string (e.g. "Paris", "Lyon Part-Dieu", "Berlin")
     * @param lang language code (e.g. "fr", "en")
     * @return list of matching places and stops
     */
    public List<GeocodeResult> geocode(String text, String lang) throws TravelProviderException {
        if (text == null || text.trim().length() < 2) {
            return Collections.emptyList();
        }

        String language = (lang != null && !lang.isBlank()) ? lang.trim() : properties.getLang();

        try {
            List<GeocodeResult> results = restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/geocode")
                            .queryParam("text", text.trim())
                            .queryParam("lang", language)
                            .build())
                    .header(HttpHeaders.USER_AGENT, properties.getUserAgent())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(new ParameterizedTypeReference<List<GeocodeResult>>() {});

            return results != null ? results : Collections.emptyList();
        } catch (ResourceAccessException ex) {
            log.error("TransitousClient: Timeout during geocode query for '{}'", text);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Transitous geocoding request timed out: " + ex.getMessage());
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("TransitousClient: Unexpected error querying geocode for '{}'", text, ex);
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to parse Transitous geocode response: " + ex.getMessage(), ex);
        }
    }

    /**
     * Computes optimal public transit / rail connections using the Transitous routing service (/v6/plan).
     *
     * @param fromPlace origin coordinates ("lat,lon") or stop ID
     * @param toPlace destination coordinates ("lat,lon") or stop ID
     * @param isoDateTime departure date-time in ISO format (e.g. "2026-09-22T08:00:00Z")
     * @param numItineraries number of itineraries to compute (default 5)
     * @param transitModes allowed transit modes (e.g. "LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL")
     * @return computed journey plan response
     */
    public PlanResponse plan(String fromPlace,
                             String toPlace,
                             String isoDateTime,
                             Integer numItineraries,
                             String transitModes) throws TravelProviderException {
        if (fromPlace == null || fromPlace.isBlank() || toPlace == null || toPlace.isBlank()) {
            throw TravelProviderException.badRequest("fromPlace and toPlace parameters are required");
        }

        int count = (numItineraries != null && numItineraries > 0) ? numItineraries : 5;
        String modes = (transitModes != null && !transitModes.isBlank())
                ? transitModes
                : "LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL,SUBWAY,TRAM";

        try {
            return restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/v6/plan")
                                .queryParam("fromPlace", fromPlace.trim())
                                .queryParam("toPlace", toPlace.trim())
                                .queryParam("numItineraries", count)
                                .queryParam("transitModes", modes)
                                .queryParam("timetableView", "true")
                                .queryParam("arriveBy", "false");

                        if (isoDateTime != null && !isoDateTime.isBlank()) {
                            uriBuilder.queryParam("time", isoDateTime.trim());
                        }

                        return uriBuilder.build();
                    })
                    .header(HttpHeaders.USER_AGENT, properties.getUserAgent())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(PlanResponse.class);
        } catch (ResourceAccessException ex) {
            log.error("TransitousClient: Timeout during plan query from '{}' to '{}'", fromPlace, toPlace);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Transitous journey planning request timed out: " + ex.getMessage());
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("TransitousClient: Unexpected error during plan query from '{}' to '{}'", fromPlace, toPlace, ex);
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to parse Transitous journey plan response: " + ex.getMessage(), ex);
        }
    }

    private void handleHttpError(HttpStatusCode status) throws TravelProviderException {
        int code = status.value();
        if (code == 429) {
            log.warn("TransitousClient: Rate limit exceeded (429)");
            throw TravelProviderException.rateLimitExceeded(PROVIDER_CODE, "Transitous public API rate limit reached. Please retry in a few moments.");
        } else if (code == 400 || code == 422) {
            log.warn("TransitousClient: Bad request ({})", code);
            throw TravelProviderException.badRequest("Transitous request invalid or route cannot be computed");
        } else if (code >= 500) {
            log.error("TransitousClient: Upstream server error ({})", code);
            throw TravelProviderException.providerUnavailable(PROVIDER_CODE, "Transitous routing service is temporarily unavailable (" + code + ")");
        } else {
            throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID, "Transitous API returned error status: " + code);
        }
    }
}
