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

import com.ahmed.travelservice.dto.response.AirportDto;
import com.ahmed.travelservice.service.AirportDirectory;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Pattern;

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

    private static final Pattern GPS_PATTERN = Pattern.compile("^-?\\d+(\\.\\d+)?\\s*,\\s*-?\\d+(\\.\\d+)?$");
    private static final Set<String> VALID_LOCATION_TYPES = Set.of("IATA", "ATLAS", "GPS", "PORT", "STATION");

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
     * Accepts:
     * - Explicit provider type prefix: IATA, ATLAS, GPS, PORT, STATION (e.g. "IATA:CDG", "GPS:41.2974,2.0833")
     * - Raw GPS coordinates: lat,lng
     * - 3-letter IATA code: e.g. "CDG", "BCN", "RAK", "JFK"
     * - Airport / city name lookup dynamically from AirportDirectory
     */
    public static LocationPoint resolveOrigin(String input) {
        if (input == null || input.isBlank()) {
            return null;
        }
        String trimmed = input.trim();

        // 1. Check for explicit provider type prefix: TYPE:CODE
        int colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
            String prefix = trimmed.substring(0, colonIdx).toUpperCase(Locale.ROOT);
            String code = trimmed.substring(colonIdx + 1).trim();
            if (VALID_LOCATION_TYPES.contains(prefix) && !code.isEmpty()) {
                return new LocationPoint(prefix, code);
            }
        }

        // 2. Check for GPS coordinates
        if (GPS_PATTERN.matcher(trimmed).matches()) {
            return new LocationPoint("GPS", trimmed.replaceAll("\\s+", ""));
        }

        // 3. Dynamic airport lookup from AirportDirectory (by name, city, or IATA code)
        Optional<AirportDto> airportOpt = AirportDirectory.findAirport(trimmed);
        if (airportOpt.isPresent()) {
            return new LocationPoint("IATA", airportOpt.get().getCode().toUpperCase(Locale.ROOT));
        }

        // 4. Check for valid 3-letter IATA code
        String upper = trimmed.toUpperCase(Locale.ROOT);
        if (upper.length() == 3 && upper.chars().allMatch(Character::isLetter)) {
            return new LocationPoint("IATA", upper);
        }

        return null;
    }

    /**
     * Resolves destination into HBX LocationPoint (toType, toCode).
     * Accepts:
     * - Explicit provider type prefix: IATA, ATLAS, GPS, PORT, STATION
     * - Raw GPS coordinates: lat,lng
     * - Destination city or airport lookup dynamically from AirportDirectory (maps to city center coordinates)
     * - 3-letter IATA code (if different from origin)
     * - Fallback: dynamically derives city center coordinates from the origin airport
     */
    public static LocationPoint resolveDestination(String input, String originCode) {
        String trimmed = input != null ? input.trim() : "";

        // 1. Check for explicit provider type prefix: TYPE:CODE
        int colonIdx = trimmed.indexOf(':');
        if (colonIdx > 0) {
            String prefix = trimmed.substring(0, colonIdx).toUpperCase(Locale.ROOT);
            String code = trimmed.substring(colonIdx + 1).trim();
            if (VALID_LOCATION_TYPES.contains(prefix) && !code.isEmpty()) {
                return new LocationPoint(prefix, code);
            }
        }

        // 2. Check for GPS coordinates
        if (GPS_PATTERN.matcher(trimmed).matches()) {
            return new LocationPoint("GPS", trimmed.replaceAll("\\s+", ""));
        }

        // 3. Dynamic destination city or airport lookup from AirportDirectory
        if (!trimmed.isEmpty()) {
            Optional<AirportDto> airportOpt = AirportDirectory.findAirport(trimmed);
            if (airportOpt.isPresent()) {
                AirportDto destAirport = airportOpt.get();
                // Route to city center coordinates for transfers into destination cities/resorts
                if (destAirport.getCityLatitude() != null && destAirport.getCityLongitude() != null) {
                    return new LocationPoint("GPS", String.format(Locale.ROOT, "%.4f,%.4f", destAirport.getCityLatitude(), destAirport.getCityLongitude()));
                }
                // If a different airport is explicitly requested as dropoff
                if (!destAirport.getCode().equalsIgnoreCase(originCode)) {
                    return new LocationPoint("IATA", destAirport.getCode().toUpperCase(Locale.ROOT));
                }
            }
        }

        // 4. Check for 3-letter IATA code (if different from origin)
        String upper = trimmed.toUpperCase(Locale.ROOT);
        if (upper.length() == 3 && upper.chars().allMatch(Character::isLetter)) {
            if (!upper.equalsIgnoreCase(originCode)) {
                return new LocationPoint("IATA", upper);
            }
        }

        // 5. Fallback for generic destination ("Centre-ville", "Hôtel", unparsed) -> derive city center from origin airport
        return resolveCityCenterCoordinates(originCode).orElse(null);
    }

    private static Optional<LocationPoint> resolveCityCenterCoordinates(String originCode) {
        if (originCode == null || originCode.isBlank()) {
            return Optional.empty();
        }
        return AirportDirectory.findAirport(originCode)
                .map(a -> {
                    if (a.getCityLatitude() != null && a.getCityLongitude() != null) {
                        return new LocationPoint("GPS", String.format(Locale.ROOT, "%.4f,%.4f", a.getCityLatitude(), a.getCityLongitude()));
                    }
                    if (a.getLatitude() != null && a.getLongitude() != null) {
                        // Offset by ~5km to avoid airport-to-same-airport zero result
                        return new LocationPoint("GPS", String.format(Locale.ROOT, "%.4f,%.4f", a.getLatitude() + 0.04, a.getLongitude() + 0.04));
                    }
                    return null;
                });
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
