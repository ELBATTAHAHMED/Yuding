package com.ahmed.travelservice.provider.impl.geoapify;

import com.ahmed.travelservice.config.GeoapifyProperties;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.geoapify.model.GeoapifyModels.FeatureCollection;
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
 * Dedicated HTTP client for Geoapify APIs (Geocoding, Places, and Static Maps).
 * API keys are strictly kept on the server and attached as query parameters.
 */
@Component
public class GeoapifyClient {

    private static final Logger log = LoggerFactory.getLogger(GeoapifyClient.class);
    public static final String PROVIDER_CODE = "GEOAPIFY";

    private final GeoapifyProperties properties;
    private final RestClient restClient;
    private final RestClient mapsRestClient;

    @Autowired
    public GeoapifyClient(GeoapifyProperties properties) {
        this(properties, createDefaultRestClient(properties), createDefaultMapsRestClient(properties));
    }

    public GeoapifyClient(GeoapifyProperties properties, RestClient restClient, RestClient mapsRestClient) {
        this.properties = properties;
        this.restClient = restClient;
        this.mapsRestClient = mapsRestClient;
    }

    private static RestClient createDefaultRestClient(GeoapifyProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "Yuding/2.0 (Geo; travel-service)")
                .build();
    }

    private static RestClient createDefaultMapsRestClient(GeoapifyProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getMapsBaseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, "Yuding/2.0 (Geo; travel-service)")
                .build();
    }

    private void ensureConfigured() throws TravelProviderException {
        if (!properties.isConfigured()) {
            throw TravelProviderException.notConfigured(PROVIDER_CODE, "Geoapify API key is not configured");
        }
    }

    /**
     * Autocomplete cities and addresses (GET /v1/geocode/autocomplete).
     */
    public FeatureCollection autocomplete(String text, String type, String lang, String country, Integer limit, Double biasLat, Double biasLon) throws TravelProviderException {
        ensureConfigured();
        if (text == null || text.trim().length() < 2) {
            return new FeatureCollection();
        }

        String language = (lang != null && !lang.isBlank()) ? lang.trim() : properties.getDefaultLanguage();
        int resultLimit = (limit != null && limit > 0) ? Math.min(limit, 20) : properties.getAutocompleteLimit();

        try {
            return restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/v1/geocode/autocomplete")
                                .queryParam("text", text.trim())
                                .queryParam("lang", language)
                                .queryParam("limit", resultLimit)
                                .queryParam("apiKey", properties.getApiKey());

                        if (type != null && !type.isBlank()) {
                            uriBuilder.queryParam("type", type.trim());
                        }
                        if (country != null && !country.isBlank()) {
                            // Geoapify filter format: countrycode:ma,fr
                            String normalizedCountry = country.trim().toLowerCase();
                            if (!normalizedCountry.startsWith("countrycode:")) {
                                normalizedCountry = "countrycode:" + normalizedCountry;
                            }
                            uriBuilder.queryParam("filter", normalizedCountry);
                        }
                        if (biasLat != null && biasLon != null) {
                            uriBuilder.queryParam("bias", "proximity:" + biasLon + "," + biasLat);
                        }
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(FeatureCollection.class);
        } catch (ResourceAccessException ex) {
            log.error("GeoapifyClient: Timeout during autocomplete query for '{}'", text);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Geoapify autocomplete timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("GeoapifyClient: Unexpected error during autocomplete", ex);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify autocomplete request failed");
        }
    }

    /**
     * Forward geocode address / place (GET /v1/geocode/search).
     */
    public FeatureCollection geocode(String text, String lang, String country, Integer limit) throws TravelProviderException {
        ensureConfigured();
        if (text == null || text.trim().isBlank()) {
            return new FeatureCollection();
        }

        String language = (lang != null && !lang.isBlank()) ? lang.trim() : properties.getDefaultLanguage();
        int resultLimit = (limit != null && limit > 0) ? Math.min(limit, 20) : 5;

        try {
            return restClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/v1/geocode/search")
                                .queryParam("text", text.trim())
                                .queryParam("lang", language)
                                .queryParam("limit", resultLimit)
                                .queryParam("apiKey", properties.getApiKey());

                        if (country != null && !country.isBlank()) {
                            String normalizedCountry = country.trim().toLowerCase();
                            if (!normalizedCountry.startsWith("countrycode:")) {
                                normalizedCountry = "countrycode:" + normalizedCountry;
                            }
                            uriBuilder.queryParam("filter", normalizedCountry);
                        }
                        return uriBuilder.build();
                    })
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(FeatureCollection.class);
        } catch (ResourceAccessException ex) {
            log.error("GeoapifyClient: Timeout during geocode query for '{}'", text);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Geoapify geocoding timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("GeoapifyClient: Unexpected error during geocode", ex);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify geocode request failed");
        }
    }

    /**
     * Reverse geocode coordinates -> place (GET /v1/geocode/reverse).
     */
    public FeatureCollection reverseGeocode(Double lat, Double lon, String lang) throws TravelProviderException {
        ensureConfigured();
        if (lat == null || lon == null) {
            return new FeatureCollection();
        }

        String language = (lang != null && !lang.isBlank()) ? lang.trim() : properties.getDefaultLanguage();

        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/v1/geocode/reverse")
                            .queryParam("lat", lat)
                            .queryParam("lon", lon)
                            .queryParam("lang", language)
                            .queryParam("apiKey", properties.getApiKey())
                            .build())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(FeatureCollection.class);
        } catch (ResourceAccessException ex) {
            log.error("GeoapifyClient: Timeout during reverse geocode [lat={}, lon={}]", lat, lon);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Geoapify reverse geocode timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("GeoapifyClient: Unexpected error during reverse geocode", ex);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify reverse geocode request failed");
        }
    }

    /**
     * Search nearby places / POIs (GET /v2/places).
     */
    public FeatureCollection findPlaces(Double lat, Double lon, Integer radiusMeters, String categories, Integer limit, String lang) throws TravelProviderException {
        ensureConfigured();
        if (lat == null || lon == null) {
            return new FeatureCollection();
        }

        String language = (lang != null && !lang.isBlank()) ? lang.trim() : properties.getDefaultLanguage();
        int radius = (radiusMeters != null && radiusMeters > 0) ? Math.min(radiusMeters, 50000) : 5000;
        int resultLimit = (limit != null && limit > 0) ? Math.min(limit, 50) : properties.getPlacesLimit();
        String cats = (categories != null && !categories.isBlank()) ? categories.trim() : "tourism.sights,catering.restaurant,catering.cafe,entertainment.museum";

        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/v2/places")
                            .queryParam("categories", cats)
                            .queryParam("filter", "circle:" + lon + "," + lat + "," + radius)
                            .queryParam("bias", "proximity:" + lon + "," + lat)
                            .queryParam("limit", resultLimit)
                            .queryParam("lang", language)
                            .queryParam("apiKey", properties.getApiKey())
                            .build())
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(FeatureCollection.class);
        } catch (ResourceAccessException ex) {
            log.error("GeoapifyClient: Timeout during places query [lat={}, lon={}, radius={}]", lat, lon, radius);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Geoapify places search timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("GeoapifyClient: Unexpected error during places query", ex);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify places search request failed");
        }
    }

    /**
     * Get static map PNG bytes (GET https://maps.geoapify.com/v1/staticmap).
     */
    public byte[] getStaticMap(Double centerLat, Double centerLon, Integer zoom, Integer width, Integer height, String markers) throws TravelProviderException {
        ensureConfigured();
        if (centerLat == null || centerLon == null) {
            return new byte[0];
        }

        int z = (zoom != null && zoom >= 1 && zoom <= 20) ? zoom : 13;
        int w = (width != null && width >= 200 && width <= 1200) ? width : 600;
        int h = (height != null && height >= 150 && height <= 1200) ? height : 400;

        try {
            return mapsRestClient.get()
                    .uri(uriBuilder -> {
                        uriBuilder.path("/v1/staticmap")
                                .queryParam("style", "osm-bright")
                                .queryParam("width", w)
                                .queryParam("height", h)
                                .queryParam("center", "lonlat:" + centerLon + "," + centerLat)
                                .queryParam("zoom", z)
                                .queryParam("apiKey", properties.getApiKey());

                        if (markers != null && !markers.isBlank()) {
                            uriBuilder.queryParam("marker", markers.trim());
                        } else {
                            // Default destination marker
                            uriBuilder.queryParam("marker", "lonlat:" + centerLon + "," + centerLat);
                        }
                        return uriBuilder.build();
                    })
                    .accept(MediaType.IMAGE_PNG, MediaType.IMAGE_JPEG)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (req, res) -> handleHttpError(res.getStatusCode()))
                    .body(byte[].class);
        } catch (ResourceAccessException ex) {
            log.error("GeoapifyClient: Timeout during static map request [lat={}, lon={}]", centerLat, centerLon);
            throw TravelProviderException.timeout(PROVIDER_CODE, "Geoapify static map request timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("GeoapifyClient: Unexpected error during static map request", ex);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify static map request failed");
        }
    }

    private void handleHttpError(HttpStatusCode statusCode) throws TravelProviderException {
        int code = statusCode.value();
        if (code == 401 || code == 403) {
            log.error("GeoapifyClient: Authentication failed (HTTP {})", code);
            throw TravelProviderException.authenticationFailed(PROVIDER_CODE, "Geoapify authentication failed");
        } else if (code == 429) {
            log.warn("GeoapifyClient: Quota / Rate limit exceeded (HTTP 429)");
            throw TravelProviderException.rateLimitExceeded(PROVIDER_CODE, "Geoapify rate limit or monthly quota exceeded");
        } else if (code == 400) {
            log.warn("GeoapifyClient: Bad request sent to provider (HTTP 400)");
            throw TravelProviderException.invalidSearch(PROVIDER_CODE, "Geoapify rejected request as invalid");
        } else if (code >= 500) {
            log.error("GeoapifyClient: Server error from provider (HTTP {})", code);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify service returned server error: " + code);
        } else {
            log.warn("GeoapifyClient: Unexpected HTTP error from provider (HTTP {})", code);
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Geoapify request failed with HTTP " + code);
        }
    }
}
