package com.ahmed.travelservice.provider.impl.tomtom;

import com.ahmed.travelservice.config.TomTomProperties;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/**
 * Proxies TomTom raster map tiles so the browser never receives the provider key.
 */
@Component
public class TomTomMapClient {

    private static final Logger log = LoggerFactory.getLogger(TomTomMapClient.class);
    public static final String PROVIDER_CODE = "TOMTOM";

    private final TomTomProperties properties;
    private final RestClient restClient;

    @Autowired
    public TomTomMapClient(TomTomProperties properties) {
        this.properties = properties;
        this.restClient = createRestClient(properties);
    }

    public TomTomMapClient(TomTomProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient createRestClient(TomTomProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());

        return RestClient.builder()
                .requestFactory(factory)
                .baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.USER_AGENT, "Yuding/2.0 (TomTom map; travel-service)")
                .build();
    }

    public byte[] getRasterTile(int zoom, int x, int y) throws TravelProviderException {
        ensureConfigured();
        validateTile(zoom, x, y);

        try {
            return restClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/map/1/tile/basic/main/{zoom}/{x}/{y}.png")
                            .queryParam("key", properties.getApiKey())
                            .queryParam("tileSize", 512)
                            .build(zoom, x, y))
                    .accept(MediaType.IMAGE_PNG, MediaType.IMAGE_JPEG)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, (request, response) -> handleHttpError(response.getStatusCode()))
                    .body(byte[].class);
        } catch (ResourceAccessException ex) {
            log.warn("TomTomMapClient: timeout loading tile z={}, x={}, y={}", zoom, x, y);
            throw TravelProviderException.timeout(PROVIDER_CODE, "TomTom map tile request timed out");
        } catch (TravelProviderException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("TomTomMapClient: tile request failed z={}, x={}, y={}: {}", zoom, x, y, ex.getMessage());
            throw TravelProviderException.unavailable(PROVIDER_CODE, "TomTom map tile request failed");
        }
    }

    private void ensureConfigured() {
        if (!properties.isConfigured()) {
            throw TravelProviderException.notConfigured(PROVIDER_CODE, "TomTom API key is not configured");
        }
    }

    private void validateTile(int zoom, int x, int y) {
        if (zoom < 1 || zoom > 22) {
            throw TravelProviderException.invalidSearch(PROVIDER_CODE, "TomTom tile zoom must be between 1 and 22");
        }
        int tileCount = 1 << zoom;
        if (x < 0 || x >= tileCount || y < 0 || y >= tileCount) {
            throw TravelProviderException.invalidSearch(PROVIDER_CODE, "TomTom tile coordinates are out of range");
        }
    }

    private void handleHttpError(HttpStatusCode statusCode) {
        int code = statusCode.value();
        if (code == 401 || code == 403) {
            throw TravelProviderException.authenticationFailed(PROVIDER_CODE, "TomTom authentication failed");
        }
        if (code == 429) {
            throw TravelProviderException.rateLimitExceeded(PROVIDER_CODE, "TomTom map quota or rate limit exceeded");
        }
        if (code == 400) {
            throw TravelProviderException.invalidSearch(PROVIDER_CODE, "TomTom rejected the map tile request");
        }
        throw TravelProviderException.unavailable(PROVIDER_CODE, "TomTom map service returned HTTP " + code);
    }
}
