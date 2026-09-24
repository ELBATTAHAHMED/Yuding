package com.ahmed.travelservice.provider.impl.scrappa;

import com.ahmed.travelservice.config.ScrappaProperties;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaFlightResponse;
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
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URI;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Low-level HTTP client for the Scrappa Google Flights API.
 *
 * Responsibilities:
 * - Builds GET requests with all required query parameters.
 * - Sends the X-API-KEY header (value NEVER logged).
 * - Maps Scrappa HTTP error codes to TravelProviderException.
 * - Enforces connect + read timeouts.
 * - Extracts 3-letter IATA codes from Yuding inputs like "Casablanca (CMN)".
 *
 * Security:
 * - API key is NEVER logged.
 * - Full provider response body is NEVER logged.
 * - Only safe metadata (status category, result count) is logged.
 */
@Component
public class ScrappaClient {

    private static final Logger log = LoggerFactory.getLogger(ScrappaClient.class);
    static final String PROVIDER_CODE = "SCRAPPA";

    /** Pattern to extract IATA code from strings like "Casablanca (CMN)" or bare "CMN". */
    private static final Pattern IATA_IN_PARENS = Pattern.compile("\\(([A-Za-z]{3})\\)");
    private static final Pattern BARE_IATA = Pattern.compile("^\\s*([A-Za-z]{3})\\s*$");

    private final ScrappaProperties props;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public ScrappaClient(ScrappaProperties props) {
        this.props = props;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.getConnectTimeoutMs());
        factory.setReadTimeout(props.getReadTimeoutMs());

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(props.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        // Use BigDecimal for all JSON numbers to preserve monetary precision.
        this.objectMapper = new ObjectMapper()
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    // ─── Public API ────────────────────────────────────────────────────────────

    /**
     * Executes a one-way flight search against Scrappa.
     * Endpoint: GET /flights/one-way
     *
     * @throws TravelProviderException on any provider error.
     */
    public ScrappaFlightResponse searchOneWay(FlightSearchQuery query) {
        validateConfigured();

        String origin = extractIata(query.getOrigin(), "origin");
        String destination = extractIata(query.getDestination(), "destination");

        String baseUrl = props.getBaseUrl().replaceAll("/+$", "");
        URI uri = UriComponentsBuilder.fromUriString(baseUrl + "/flights/one-way")
                .queryParam("origin", origin)
                .queryParam("destination", destination)
                .queryParam("departure_date", query.getDepartureDate().toString())
                .queryParamIfPresent("adults", java.util.Optional.of(query.getAdults()))
                .queryParamIfPresent("children", query.getChildren() > 0
                        ? java.util.Optional.of(query.getChildren()) : java.util.Optional.empty())
                .queryParamIfPresent("infants_on_lap", query.getInfants() > 0
                        ? java.util.Optional.of(query.getInfants()) : java.util.Optional.empty())
                .queryParamIfPresent("cabin_class", java.util.Optional.ofNullable(mapCabinClass(query.getTravelClass())))
                .queryParamIfPresent("max_stops", query.isNonStop()
                        ? java.util.Optional.of("nonstop") : java.util.Optional.empty())
                .queryParamIfPresent("currency", java.util.Optional.ofNullable(
                        query.getCurrency() != null && !query.getCurrency().isBlank()
                                ? query.getCurrency() : null))
                .build()
                .toUri();

        log.info("[Scrappa] one-way search: provider=SCRAPPA origin={} destination={} date={} pax={}",
                origin, destination, query.getDepartureDate(), query.getTotalPassengers());

        return executeGet(uri);
    }

    /**
     * Executes a round-trip flight search against Scrappa (first stage — outbound only).
     * Endpoint: GET /flights/v2/round-trip
     *
     * @throws TravelProviderException on any provider error.
     */
    public ScrappaFlightResponse searchRoundTrip(FlightSearchQuery query) {
        return searchRoundTrip(query, null);
    }

    /**
     * Executes a round-trip request with an optional departure_token to retrieve return flights.
     * First stage (no token): returns outbound flights with itinerary_complete=false.
     * Second stage (with token): returns matched return flights.
     *
     * @throws TravelProviderException on any provider error.
     */
    public ScrappaFlightResponse searchRoundTrip(FlightSearchQuery query, String departureToken) {
        validateConfigured();

        String origin = extractIata(query.getOrigin(), "origin");
        String destination = extractIata(query.getDestination(), "destination");

        String baseUrl = props.getBaseUrl().replaceAll("/+$", "");
        UriComponentsBuilder builder = UriComponentsBuilder.fromUriString(baseUrl + "/flights/v2/round-trip")
                .queryParam("origin", origin)
                .queryParam("destination", destination)
                .queryParam("departure_date", query.getDepartureDate().toString())
                .queryParam("return_date", query.getReturnDate().toString())
                .queryParamIfPresent("departure_token", departureToken != null
                        ? java.util.Optional.of(departureToken) : java.util.Optional.empty())
                .queryParamIfPresent("adults", java.util.Optional.of(query.getAdults()))
                .queryParamIfPresent("children", query.getChildren() > 0
                        ? java.util.Optional.of(query.getChildren()) : java.util.Optional.empty())
                .queryParamIfPresent("infants_on_lap", query.getInfants() > 0
                        ? java.util.Optional.of(query.getInfants()) : java.util.Optional.empty())
                .queryParamIfPresent("cabin_class", java.util.Optional.ofNullable(mapCabinClass(query.getTravelClass())))
                .queryParamIfPresent("max_stops", query.isNonStop()
                        ? java.util.Optional.of("nonstop") : java.util.Optional.empty())
                .queryParamIfPresent("currency", java.util.Optional.ofNullable(
                        query.getCurrency() != null && !query.getCurrency().isBlank()
                                ? query.getCurrency() : null));

        URI uri = builder.build().toUri();

        String stage = departureToken != null ? "return" : "outbound";
        log.info("[Scrappa] round-trip {} search: provider=SCRAPPA origin={} destination={} dep={} ret={} pax={}",
                stage, origin, destination, query.getDepartureDate(), query.getReturnDate(),
                query.getTotalPassengers());

        return executeGet(uri);
    }

    /**
     * Retrieves the major airports list from Scrappa.
     * Endpoint: GET /flights/airports (free endpoint).
     *
     * @throws TravelProviderException on any provider error.
     */
    public com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaAirportsResponse getAirports() {
        validateConfigured();

        String baseUrl = props.getBaseUrl().replaceAll("/+$", "");
        URI uri = UriComponentsBuilder.fromUriString(baseUrl + "/flights/airports")
                .build()
                .toUri();

        log.info("[Scrappa] fetching airports directory: provider=SCRAPPA");
        return executeGetAirports(uri);
    }

    private com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaAirportsResponse executeGetAirports(URI relativeUri) {
        try {
            byte[] responseBytes = restClient.get()
                    .uri(relativeUri)
                    .header("X-API-KEY", props.getApiKey())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        int status = response.getStatusCode().value();
                        mapClientError(status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (request, response) -> {
                        int status = response.getStatusCode().value();
                        log.warn("[Scrappa] provider error: HTTP {}", status);
                        throw new TravelProviderException(PROVIDER_CODE,
                                ProviderErrorCode.PROVIDER_UNAVAILABLE,
                                "Scrappa returned HTTP " + status + " (server error)");
                    })
                    .body(byte[].class);

            if (responseBytes == null || responseBytes.length == 0) {
                return new com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaAirportsResponse();
            }

            return objectMapper.readValue(responseBytes, com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaAirportsResponse.class);
        } catch (TravelProviderException e) {
            throw e;
        } catch (ResourceAccessException e) {
            log.warn("[Scrappa] request timed out or unreachable: {}", e.getMessage());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_TIMEOUT,
                    "Scrappa request timed out: " + e.getMessage(), e);
        } catch (Exception e) {
            log.warn("[Scrappa] unexpected error during airport request: {}", e.getClass().getSimpleName());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to parse Scrappa airport response: " + e.getMessage(), e);
        }
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    private ScrappaFlightResponse executeGet(URI relativeUri) {
        try {
            byte[] responseBytes = restClient.get()
                    .uri(relativeUri)
                    .header("X-API-KEY", props.getApiKey())
                    .retrieve()
                    .onStatus(HttpStatusCode::is4xxClientError, (request, response) -> {
                        int status = response.getStatusCode().value();
                        mapClientError(status);
                    })
                    .onStatus(HttpStatusCode::is5xxServerError, (request, response) -> {
                        int status = response.getStatusCode().value();
                        log.warn("[Scrappa] provider error: HTTP {}", status);
                        throw new TravelProviderException(PROVIDER_CODE,
                                ProviderErrorCode.PROVIDER_UNAVAILABLE,
                                "Scrappa returned HTTP " + status + " (server error)");
                    })
                    .body(byte[].class);

            if (responseBytes == null || responseBytes.length == 0) {
                throw new TravelProviderException(PROVIDER_CODE,
                        ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                        "Scrappa returned an empty response body");
            }

            ScrappaFlightResponse parsed = objectMapper.readValue(responseBytes, ScrappaFlightResponse.class);

            int count = parsed.safeFlights().size();
            log.info("[Scrappa] response received: provider=SCRAPPA resultCount={}", count);

            return parsed;

        } catch (TravelProviderException e) {
            throw e;
        } catch (ResourceAccessException e) {
            log.warn("[Scrappa] request timed out or unreachable: {}", e.getMessage());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_TIMEOUT,
                    "Scrappa request timed out: " + e.getMessage(), e);
        } catch (Exception e) {
            log.warn("[Scrappa] unexpected error during request: {}", e.getClass().getSimpleName());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Failed to parse Scrappa response: " + e.getMessage(), e);
        }
    }

    private void mapClientError(int status) {
        switch (status) {
            case 401 -> throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                    "Scrappa API key is invalid or missing (HTTP 401)");
            case 402 -> throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_QUOTA_EXHAUSTED,
                    "Scrappa account has no remaining credits (HTTP 402)");
            case 422 -> throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Scrappa rejected the request as invalid (HTTP 422). Check origin/destination/dates.");
            case 429 -> throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RATE_LIMITED,
                    "Scrappa rate limit reached (HTTP 429). Slow down requests.");
            default -> throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_UNAVAILABLE,
                    "Scrappa returned HTTP " + status + " (client error)");
        }
    }

    private void validateConfigured() {
        if (!props.isConfigured()) {
            throw TravelProviderException.notConfigured(PROVIDER_CODE,
                    "SCRAPPA_API_KEY is not configured. Set the SCRAPPA_API_KEY environment variable.");
        }
    }

    /**
     * Maps Yuding TravelClass enum to Scrappa cabin_class string.
     * Returns null if travelClass is null (Scrappa defaults to economy).
     */
    public static String mapCabinClass(TravelClass travelClass) {
        if (travelClass == null) return null;
        return switch (travelClass) {
            case ECONOMY -> "economy";
            case PREMIUM_ECONOMY -> "premium_economy";
            case BUSINESS -> "business";
            case FIRST -> "first";
        };
    }

    /**
     * Extracts a 3-letter IATA code from a Yuding location string.
     *
     * Handles:
     * - "Casablanca (CMN)" → "CMN"
     * - "CMN" → "CMN"
     * - "cmn" → "CMN"
     *
     * @param input the raw location string from Yuding query
     * @param fieldName used in error message only
     * @throws TravelProviderException if no valid IATA code can be extracted
     */
    public static String extractIata(String input, String fieldName) {
        if (input == null || input.isBlank()) {
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Missing required " + fieldName + " for Scrappa flight search");
        }

        // Try "(XXX)" pattern first
        Matcher parenMatcher = IATA_IN_PARENS.matcher(input);
        if (parenMatcher.find()) {
            return parenMatcher.group(1).toUpperCase();
        }

        // Try bare 3-letter IATA
        Matcher bareMatcher = BARE_IATA.matcher(input);
        if (bareMatcher.matches()) {
            return bareMatcher.group(1).toUpperCase();
        }

        // Try lookup via AirportDirectory (handles "Casablanca", "Paris", "Marrakech", etc.)
        Optional<com.ahmed.travelservice.dto.response.AirportDto> airportOpt =
                com.ahmed.travelservice.service.AirportDirectory.findAirport(input);
        if (airportOpt.isPresent()) {
            return airportOpt.get().getCode();
        }

        throw new TravelProviderException(PROVIDER_CODE,
                ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                "Cannot extract IATA airport code from " + fieldName + ": '" + input
                        + "'. Use format 'City (XXX)' or bare IATA code.");
    }
}
