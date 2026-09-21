package com.ahmed.travelservice.provider.impl.hbx;

import com.ahmed.travelservice.config.HBXProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.hbx.dto.transfers.HBXTransferAvailabilityResponse;
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

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;

/**
 * Dedicated HTTP client for the HBX / Hotelbeds APITUDE Transfers API v1.0.
 *
 * Responsibilities:
 * - Authenticates requests using Api-key and server-generated X-Signature.
 * - Enforces connect and read timeouts from HBXProperties.
 * - Maps HTTP and provider-level errors to TravelProviderException.
 * - Protects credentials: API key, secret, and signature inputs are NEVER logged.
 */
@Component
public class HBXTransfersClient {

    private static final Logger log = LoggerFactory.getLogger(HBXTransfersClient.class);
    static final String PROVIDER_CODE = "HBX";

    private final HBXProperties.SuiteConfig config;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    // Moroccan airport IATA mappings
    private static final Map<String, String> MOROCCO_AIRPORTS = Map.ofEntries(
            Map.entry("MARRAKECH", "RAK"),
            Map.entry("MARRAKESH", "RAK"),
            Map.entry("MENARA", "RAK"),
            Map.entry("CASABLANCA", "CMN"),
            Map.entry("MOHAMMED", "CMN"),
            Map.entry("AGADIR", "AGA"),
            Map.entry("MASSIRA", "AGA"),
            Map.entry("FES", "FEZ"),
            Map.entry("FEZ", "FEZ"),
            Map.entry("SAISS", "FEZ"),
            Map.entry("TANGIER", "TNG"),
            Map.entry("TANGER", "TNG"),
            Map.entry("BATTUTA", "TNG"),
            Map.entry("RABAT", "RBA"),
            Map.entry("SALE", "RBA")
    );

    // City center GPS coordinates (minimum 3 decimal places required by HBX)
    private static final Map<String, String> CITY_COORDINATES = Map.ofEntries(
            Map.entry("RAK", "31.6295,-7.9811"),
            Map.entry("MARRAKECH", "31.6295,-7.9811"),
            Map.entry("CMN", "33.5731,-7.5898"),
            Map.entry("CASABLANCA", "33.5731,-7.5898"),
            Map.entry("AGA", "30.4278,-9.5981"),
            Map.entry("AGADIR", "30.4278,-9.5981"),
            Map.entry("FEZ", "34.0181,-5.0078"),
            Map.entry("FES", "34.0181,-5.0078"),
            Map.entry("TNG", "35.7595,-5.8340"),
            Map.entry("TANGIER", "35.7595,-5.8340"),
            Map.entry("TANGER", "35.7595,-5.8340"),
            Map.entry("RBA", "34.0209,-6.8416"),
            Map.entry("RABAT", "34.0209,-6.8416")
    );

    @org.springframework.beans.factory.annotation.Autowired
    public HBXTransfersClient(HBXProperties properties) {
        this.config = properties.getTransfers();

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(config.getConnectTimeoutMs());
        factory.setReadTimeout(config.getReadTimeoutMs());

        this.restClient = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(config.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();

        this.objectMapper = new ObjectMapper()
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

        boolean hasKey = config.getApiKey() != null && !config.getApiKey().isBlank();
        boolean hasSecret = config.getSecret() != null && !config.getSecret().isBlank();
        log.info("[DIAGNOSTIC] HBXTransfersClient initialized: apiKey_configured={}, secret_configured={}, baseUrl={}",
                hasKey, hasSecret, config.getBaseUrl());
    }

    // Package-private constructor for MockRestServiceServer tests
    HBXTransfersClient(HBXProperties.SuiteConfig config, RestClient.Builder builder) {
        this.config = config;
        this.restClient = builder
                .baseUrl(config.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .build();
        this.objectMapper = new ObjectMapper()
                .enable(DeserializationFeature.USE_BIG_DECIMAL_FOR_FLOATS)
                .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    /**
     * Resolves origin into HBX LocationPoint (fromType, fromCode).
     */
    public static LocationPoint resolveOrigin(String input) {
        if (input == null || input.isBlank()) {
            return new LocationPoint("IATA", "RAK");
        }
        String normalized = input.trim().toUpperCase(Locale.ROOT);
        if (normalized.length() == 3) {
            return new LocationPoint("IATA", normalized);
        }
        for (Map.Entry<String, String> entry : MOROCCO_AIRPORTS.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return new LocationPoint("IATA", entry.getValue());
            }
        }
        return new LocationPoint("IATA", "RAK");
    }

    /**
     * Resolves destination into HBX LocationPoint (toType, toCode).
     */
    public static LocationPoint resolveDestination(String input, String originIata) {
        if (input == null || input.isBlank()) {
            String coords = CITY_COORDINATES.getOrDefault(originIata, "31.6295,-7.9811");
            return new LocationPoint("GPS", coords);
        }
        String normalized = input.trim().toUpperCase(Locale.ROOT);
        if (normalized.contains(",") && normalized.matches(".*\\d+\\.\\d+.*")) {
            return new LocationPoint("GPS", normalized.replaceAll("\\s+", ""));
        }
        if (normalized.length() == 3) {
            return new LocationPoint("IATA", normalized);
        }
        for (Map.Entry<String, String> entry : CITY_COORDINATES.entrySet()) {
            if (normalized.contains(entry.getKey())) {
                return new LocationPoint("GPS", entry.getValue());
            }
        }
        String defaultCoords = CITY_COORDINATES.getOrDefault(originIata, "31.6295,-7.9811");
        return new LocationPoint("GPS", defaultCoords);
    }

    /**
     * Checks transfer availability using the official GET availability endpoint.
     * URI format:
     * /availability/{language}/from/{fromType}/{fromCode}/to/{toType}/{toCode}/{outbound}/{adults}/{children}/{infants}
     */
    public HBXTransferAvailabilityResponse searchTransfers(String language,
                                                           String fromType, String fromCode,
                                                           String toType, String toCode,
                                                           LocalDate date, LocalTime time,
                                                           int adults, int children, int infants) throws TravelProviderException {
        String apiKey = config.getApiKey();
        String secret = config.getSecret();

        if (apiKey == null || apiKey.isBlank() || secret == null || secret.isBlank()) {
            log.warn("HBXTransfersClient: HBX_TRANSFERS_API_KEY or HBX_TRANSFERS_SECRET is not configured.");
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                    "Le service de transfert HBX n'est pas configuré avec des identifiants valides.");
        }

        String signature = HBXAuthUtils.generateSignature(apiKey, secret);

        LocalDate effectiveDate = date != null ? date : LocalDate.now().plusDays(3);
        LocalTime effectiveTime = time != null ? time : LocalTime.of(12, 0);
        String outbound = effectiveDate.format(DateTimeFormatter.ISO_LOCAL_DATE) + "T" +
                effectiveTime.format(DateTimeFormatter.ofPattern("HH:mm:ss"));

        String path = String.format("/availability/%s/from/%s/%s/to/%s/%s/%s/%d/%d/%d",
                (language != null && !language.isBlank()) ? language : "fr",
                fromType, fromCode,
                toType, toCode,
                outbound,
                Math.max(adults, 1),
                Math.max(children, 0),
                Math.max(infants, 0));

        log.info("HBXTransfersClient: Calling GET {} (from={}:{}, to={}:{})", path, fromType, fromCode, toType, toCode);

        try {
            return restClient.get()
                    .uri(path)
                    .header("Api-key", apiKey)
                    .header("X-Signature", signature)
                    .exchange((req, res) -> {
                        HttpStatusCode status = res.getStatusCode();
                        byte[] bodyBytes = res.getBody().readAllBytes();

                        if (status.is2xxSuccessful()) {
                            if (bodyBytes.length == 0) {
                                return new HBXTransferAvailabilityResponse();
                            }
                            return objectMapper.readValue(bodyBytes, HBXTransferAvailabilityResponse.class);
                        }

                        String errorJson = new String(bodyBytes);
                        log.warn("HBX Transfers API returned HTTP {}: {}", status.value(), errorJson);

                        if (status.value() == 400) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                                    "Requête de transferts invalide auprès d'HBX: " + extractErrorMessage(errorJson));
                        } else if (status.value() == 401 || status.value() == 403) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED,
                                    "Échec d'authentification HBX Transfers: identifiants ou signature invalides.");
                        } else if (status.value() == 429) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_RATE_LIMITED,
                                    "Limite de requêtes HBX Transfers atteinte. Veuillez réessayer ultérieurement.");
                        } else if (status.is5xxServerError()) {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_UNAVAILABLE,
                                    "Le service HBX Transfers est temporairement indisponible (HTTP " + status.value() + ").");
                        } else {
                            throw new TravelProviderException(PROVIDER_CODE,
                                    ProviderErrorCode.PROVIDER_REQUEST_INVALID,
                                    "Erreur HBX Transfers inattendue: HTTP " + status.value());
                        }
                    });
        } catch (TravelProviderException e) {
            throw e;
        } catch (ResourceAccessException e) {
            log.error("HBX Transfers network timeout or connection failure: {}", e.getMessage());
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_TIMEOUT,
                    "Délai d'attente dépassé lors de la communication avec HBX Transfers.");
        } catch (Exception e) {
            log.error("HBX Transfers unexpected client error: {}", e.getMessage(), e);
            throw new TravelProviderException(PROVIDER_CODE,
                    ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                    "Réponse invalide reçue de HBX Transfers: " + e.getMessage());
        }
    }

    private String extractErrorMessage(String errorJson) {
        try {
            HBXTransferAvailabilityResponse err = objectMapper.readValue(errorJson, HBXTransferAvailabilityResponse.class);
            if (err.getError() != null && err.getError().getMessage() != null) {
                return err.getError().getMessage();
            }
        } catch (Exception ignored) {
        }
        return "Format d'itinéraire non supporté";
    }

    public static record LocationPoint(String type, String code) {
    }
}
