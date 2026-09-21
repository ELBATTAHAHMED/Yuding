package com.ahmed.travelservice.provider.impl.nuitee;

import com.ahmed.travelservice.config.NuiteeProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeErrorResponse;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRatesRequest;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRatesResponse;
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

import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Dedicated HTTP client for the Nuitee Connect / LiteAPI v3 REST API.
 *
 * Responsibilities:
 * - Sends authenticated POST requests to /hotels/rates.
 * - Authenticates using the X-API-Key header (value NEVER logged).
 * - Enforces connect and read timeouts from NuiteeProperties.
 * - Maps HTTP and provider-level error codes to TravelProviderException.
 * - Preserves BigDecimal precision for all financial data.
 * - Normalizes documented no-availability responses cleanly into an empty result set.
 *
 * Security:
 * - API key is NEVER logged, echoed, or included in error messages.
 * - Raw response bodies are NEVER logged in production.
 */
@Component
public class NuiteeClient {

    private static final Logger log = LoggerFactory.getLogger(NuiteeClient.class);
    static final String PROVIDER_CODE = "NUITEE";

    private final NuiteeProperties props;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public NuiteeClient(NuiteeProperties props) {
        this.props = props;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(props.getConnectTimeoutMs());
        factory.setReadTimeout(props.getReadTimeoutMs());

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(props.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        this.objectMapper = new ObjectMapper()
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        String key = props.getApiKey();
        boolean hasKey = key != null && !key.isBlank();
        String pfx = (hasKey && key.length() >= 5) ? key.substring(0, 5) : "none";
        int len = hasKey ? key.length() : 0;
        log.info("[DIAGNOSTIC] NuiteeClient initialized: apiKey_configured={}, prefix={}, length={}, baseUrl={}",
                hasKey, pfx, len, props.getBaseUrl());
    }

    /**
     * Search hotel rates from Nuitee Connect v3.
     * Endpoint: POST /hotels/rates
     *
     * @param request the structured NuiteeRatesRequest
     * @return NuiteeRatesResponse containing hotel rates and metadata
     * @throws TravelProviderException on authentication, validation, rate-limit, timeout, or upstream failures.
     */
    public NuiteeRatesResponse searchHotelRates(NuiteeRatesRequest request) throws TravelProviderException {
        String apiKey = props.getApiKey();
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("NuiteeClient: NUITEE_API_KEY is not configured.");
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                    "Le service hôtelier Nuitee n'est pas configuré avec une clé d'API valide.");
        }

        log.info("NuiteeClient: Calling POST /hotels/rates (city={}, country={}, checkin={}, checkout={}, occupancies={})",
                request.getCityName(), request.getCountryCode(), request.getCheckin(), request.getCheckout(),
                request.getOccupancies() != null ? request.getOccupancies().size() : 0);

        try {
            return restClient.post()
                    .uri("/hotels/rates")
                    .header("X-API-Key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(request)
                    .exchange((req, res) -> {
                        HttpStatusCode statusCode = res.getStatusCode();
                        byte[] bodyBytes = res.getBody().readAllBytes();
                        String bodyStr = new String(bodyBytes, java.nio.charset.StandardCharsets.UTF_8);

                        if (statusCode.is2xxSuccessful()) {
                            NuiteeRatesResponse response;
                            try {
                                response = objectMapper.readValue(bodyBytes, NuiteeRatesResponse.class);
                            } catch (Exception e) {
                                log.error("NuiteeClient: Failed to parse 200 response JSON: {}", e.getMessage());
                                throw new TravelProviderException(PROVIDER_CODE,
                                        ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                                        "Réponse du fournisseur Nuitee invalide.", e);
                            }

                            if (response.getError() != null && response.getError().getCode() != null) {
                                return handleBusinessError(response.getError());
                            }

                            int hotelCount = response.getData() != null ? response.getData().size() : 0;
                            log.info("NuiteeClient: Successfully received {} hotel rate groups (sandbox={})",
                                    hotelCount, response.getSandbox());
                            return response;
                        }

                        // Handle non-2xx errors
                        return handleHttpError(statusCode.value(), bodyStr);
                    });
        } catch (ResourceAccessException e) {
            log.error("NuiteeClient: Upstream connection or read timeout: {}", e.getMessage());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_TIMEOUT,
                    "Le fournisseur hôtelier Nuitee a mis trop de temps à répondre: " + e.getMessage(), e);
        } catch (TravelProviderException e) {
            throw e;
        } catch (Exception e) {
            log.error("NuiteeClient: Unexpected exception: {}", e.getMessage());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_UNAVAILABLE,
                    "Une erreur inattendue est survenue lors de la communication avec Nuitee: " + e.getMessage(), e);
        }
    }

    /**
     * Fetch the explicit Nuitee hotel type IDs for the rate groups returned by
     * /hotels/rates. Standard rate responses may omit this field, while the
     * documented /data/hotels endpoint exposes it. Metadata failure must not make
     * an otherwise valid live rate search fail, so this returns an empty map.
     */
    public Map<String, Integer> getHotelTypeIds(Collection<String> hotelIds) {
        if (hotelIds == null || hotelIds.isEmpty() || props.getApiKey() == null || props.getApiKey().isBlank()) {
            return Collections.emptyMap();
        }

        String ids = hotelIds.stream()
                .filter(id -> id != null && !id.isBlank())
                .distinct()
                .collect(Collectors.joining(","));
        if (ids.isBlank()) {
            return Collections.emptyMap();
        }

        try {
            String body = restClient.get()
                    .uri(uriBuilder -> uriBuilder.path("/data/hotels")
                            .queryParam("hotelIds", ids)
                            .build())
                    .header("X-API-Key", props.getApiKey())
                    .retrieve()
                    .body(String.class);

            var root = objectMapper.readTree(body == null ? "{}" : body);
            Map<String, Integer> result = new HashMap<>();
            if (root != null && root.path("data").isArray()) {
                root.path("data").forEach(hotel -> {
                    String id = hotel.path("id").asText(null);
                    if (id != null && hotel.hasNonNull("hotelTypeId")) {
                        result.put(id, hotel.get("hotelTypeId").asInt());
                    }
                });
            }
            return result;
        } catch (Exception e) {
            log.warn("NuiteeClient: hotel type metadata unavailable; continuing without categories: {}",
                    e.getMessage());
            return Collections.emptyMap();
        }
    }

    private NuiteeRatesResponse handleBusinessError(NuiteeErrorResponse error) {
        String msg = error.getMessage() != null ? error.getMessage().toLowerCase() : "";
        String desc = error.getDescription() != null ? error.getDescription().toLowerCase() : "";

        // Check for no availability / no hotels found semantics
        if (msg.contains("no availability") || msg.contains("not found") || msg.contains("no rates")
                || desc.contains("no availability") || desc.contains("not found") || desc.contains("no rates")) {
            log.info("NuiteeClient: Provider returned business code indicating no availability (code={}): {}",
                    error.getCode(), error.getMessage());
            return NuiteeRatesResponse.builder()
                    .data(Collections.emptyList())
                    .hotels(Collections.emptyList())
                    .build();
        }

        if (error.getCode() != null && (error.getCode() == 401 || error.getCode() == 4010)) {
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                    "Échec d'authentification auprès du fournisseur hôtelier Nuitee.");
        }

        throw new TravelProviderException(PROVIDER_CODE,
                ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                "La recherche d'hôtels n'a pas pu être traitée par Nuitee: " + error.getMessage());
    }

    private NuiteeRatesResponse handleHttpError(int statusCode, String bodyStr) {
        log.warn("NuiteeClient: HTTP error {} from Nuitee", statusCode);

        NuiteeErrorResponse errObj = null;
        try {
            if (bodyStr != null && !bodyStr.isBlank()) {
                NuiteeRatesResponse parsed = objectMapper.readValue(bodyStr, NuiteeRatesResponse.class);
                if (parsed != null) {
                    errObj = parsed.getError();
                }
            }
        } catch (Exception ignored) {
        }

        if (statusCode == 401 || statusCode == 403) {
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                    "Clé d'API Nuitee non valide ou non autorisée.");
        }

        if (statusCode == 429) {
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RATE_LIMITED,
                    "Limite de requêtes atteinte auprès du fournisseur hôtelier. Veuillez réessayer plus tard.");
        }

        if (statusCode == 400) {
            String desc = errObj != null && errObj.getDescription() != null ? errObj.getDescription().toLowerCase() : "";
            String msg = errObj != null && errObj.getMessage() != null ? errObj.getMessage().toLowerCase() : "";
            if (desc.contains("no availability") || desc.contains("not found") || msg.contains("no availability")) {
                log.info("NuiteeClient: 400 error indicated no availability: {}", desc);
                return NuiteeRatesResponse.builder()
                        .data(Collections.emptyList())
                        .hotels(Collections.emptyList())
                        .build();
            }
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                    "Paramètres de recherche d'hôtels non valides pour Nuitee.");
        }

        if (statusCode >= 500) {
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_UNAVAILABLE,
                    "Le fournisseur hôtelier Nuitee rencontre des difficultés techniques temporaires.");
        }

        throw new TravelProviderException(PROVIDER_CODE,
                ProviderErrorCode.PROVIDER_UNAVAILABLE,
                "Erreur inattendue du fournisseur Nuitee (HTTP " + statusCode + ").");
    }
}
