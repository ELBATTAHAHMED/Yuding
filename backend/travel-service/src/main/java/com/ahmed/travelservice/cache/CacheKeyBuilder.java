package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.geo.GeoAutocompleteRequest;
import com.ahmed.travelservice.dto.geo.GeoGeocodeRequest;
import com.ahmed.travelservice.dto.geo.GeoReverseRequest;
import com.ahmed.travelservice.dto.geo.NearbyPlacesRequest;
import com.ahmed.travelservice.dto.image.DestinationImageRequest;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Deterministic, namespaced cache key builder.
 * Format: yuding:v2:{domain}:{provider}:{version}:{hashOrDescriptor}
 *
 * Enforces key normalization:
 * - Trimming and lowercasing text queries
 * - Uppercasing ISO currency & country codes
 * - Rounding coordinates to 4 decimal places (~11m precision)
 * - Sorting multi-value categories
 * - Excluding sensitive credentials or personal user info
 */
public final class CacheKeyBuilder {

    private static final String PREFIX = "yuding:v2";

    private CacheKeyBuilder() {}

    // ── GEO DOMAIN KEYS ──────────────────────────────────────────────────────────

    public static String geoAutocomplete(String provider, String version, GeoAutocompleteRequest req) {
        String text = normalize(req.getText());
        String type = normalize(req.getType());
        String country = normalizeUpper(req.getCountry());
        String lang = normalize(req.getLanguage());
        int limit = req.getLimit() != null ? req.getLimit() : 8;

        String raw = String.format(Locale.ROOT, "t=%s|tp=%s|c=%s|l=%s|lim=%d", text, type, country, lang, limit);
        return buildKey("geo", provider, version, "auto:" + sha256(raw));
    }

    public static String geoGeocode(String provider, String version, GeoGeocodeRequest req) {
        String text = normalize(req.getText());
        String lang = normalize(req.getLanguage());

        String raw = String.format(Locale.ROOT, "t=%s|l=%s", text, lang);
        return buildKey("geo", provider, version, "geocode:" + sha256(raw));
    }

    public static String geoReverse(String provider, String version, GeoReverseRequest req) {
        String lat = formatCoord(req.getLatitude());
        String lon = formatCoord(req.getLongitude());
        String lang = normalize(req.getLanguage());

        return buildKey("geo", provider, version, String.format(Locale.ROOT, "reverse:%s:%s:%s", lat, lon, lang));
    }

    public static String geoPoi(String provider, String version, NearbyPlacesRequest req) {
        String lat = formatCoord(req.getLatitude());
        String lon = formatCoord(req.getLongitude());
        int radius = req.getRadiusMeters() != null ? req.getRadiusMeters() : 1000;
        int limit = req.getLimit() != null ? req.getLimit() : 20;
        String categories = sortAndNormalizeCategories(req.getCategories());
        String lang = normalize(req.getLanguage());

        String raw = String.format(Locale.ROOT, "lat=%s|lon=%s|r=%d|lim=%d|cat=%s|l=%s", lat, lon, radius, limit, categories, lang);
        return buildKey("geo", provider, version, "poi:" + sha256(raw));
    }

    // ── WEATHER DOMAIN KEYS ──────────────────────────────────────────────────────

    public static String weather(String provider, String version, Double latitude, Double longitude, int forecastDays) {
        String lat = formatCoord(latitude);
        String lon = formatCoord(longitude);
        return buildKey("weather", provider, version, String.format(Locale.ROOT, "%s:%s:d%d", lat, lon, forecastDays));
    }

    // ── CURRENCY DOMAIN KEYS ─────────────────────────────────────────────────────

    public static String currency(String provider, String version, String fromCurrency, String toCurrency) {
        String from = normalizeUpper(fromCurrency);
        String to = normalizeUpper(toCurrency);
        return buildKey("currency", provider, version, String.format(Locale.ROOT, "%s:%s", from, to));
    }

    // ── DESTINATION IMAGES DOMAIN KEYS ───────────────────────────────────────────

    public static String destinationImages(String provider, String version, DestinationImageRequest req) {
        String city = normalize(req.getCity());
        String country = normalize(req.getCountry());
        String countryCode = normalizeUpper(req.getCountryCode());
        int limit = req.getLimit() != null ? req.getLimit() : 3;

        String raw = String.format(Locale.ROOT, "city=%s|country=%s|cc=%s|lim=%d", city, country, countryCode, limit);
        return buildKey("images", provider, version, "dest:" + sha256(raw));
    }

    // ── SEARCH DOMAIN KEYS ───────────────────────────────────────────────────────

    public static String flightSearch(String provider, String version, FlightSearchQuery query) {
        String raw = String.format(Locale.ROOT, "orig=%s|dest=%s|dep=%s|ret=%s|a=%d|c=%d|i=%d|class=%s|nonStop=%b|cur=%s",
                normalizeUpper(query.getOrigin()),
                normalizeUpper(query.getDestination()),
                query.getDepartureDate(),
                query.getReturnDate(),
                query.getAdults(),
                query.getChildren(),
                query.getInfants(),
                query.getTravelClass(),
                query.isNonStop(),
                normalizeUpper(query.getCurrency()));
        return buildKey("search", "flights:" + normalize(provider), version, sha256(raw));
    }

    public static String hotelSearch(String provider, String version, HotelSearchQuery query) {
        String raw = String.format(Locale.ROOT, "dest=%s|city=%s|cc=%s|in=%s|out=%s|rooms=%d|a=%d|c=%d|nat=%s|cur=%s",
                normalize(query.getDestination()),
                normalize(query.getCity()),
                normalizeUpper(query.getCountryCode()),
                query.getCheckIn(),
                query.getCheckOut(),
                query.getRooms(),
                query.getAdults(),
                query.getChildren(),
                normalizeUpper(query.getGuestNationality()),
                normalizeUpper(query.getCurrency()));
        return buildKey("search", "hotels:" + normalize(provider), version, sha256(raw));
    }

    public static String activitySearch(String provider, String version, ActivitySearchQuery query) {
        String raw = String.format(Locale.ROOT, "dest=%s|date=%s|pax=%d|cat=%s|rad=%d|cur=%s",
                normalize(query.getDestination()),
                query.getDate(),
                query.getTravelers(),
                query.getCategory(),
                query.getRadiusKm(),
                normalizeUpper(query.getCurrency()));
        return buildKey("search", "activities:" + normalize(provider), version, sha256(raw));
    }

    public static String transferSearch(String provider, String version, TransferSearchQuery query) {
        String raw = String.format(Locale.ROOT, "pick=%s|drop=%s|date=%s|time=%s|pax=%d|type=%s|cur=%s",
                normalize(query.getPickup()),
                normalize(query.getDropoff()),
                query.getDate(),
                query.getTime(),
                query.getPassengers(),
                query.getTransferType(),
                normalizeUpper(query.getCurrency()));
        return buildKey("search", "transfers:" + normalize(provider), version, sha256(raw));
    }

    public static String trainSearch(String provider, String version, TrainSearchQuery query) {
        String raw = String.format(Locale.ROOT, "orig=%s|dest=%s|date=%s|time=%s|origCoord=%s|destCoord=%s|origCc=%s|destCc=%s|cur=%s",
                normalize(query.getOriginStation()),
                normalize(query.getDestinationStation()),
                query.getDate(),
                query.getDepartureTime(),
                normalize(query.getOriginCoordinates()),
                normalize(query.getDestinationCoordinates()),
                normalizeUpper(query.getOriginCountryCode()),
                normalizeUpper(query.getDestinationCountryCode()),
                normalizeUpper(query.getCurrency()));
        return buildKey("search", "trains:" + normalize(provider), version, sha256(raw));
    }

    // ── HELPER UTILITIES ─────────────────────────────────────────────────────────

    public static String buildKey(String domain, String provider, String version, String descriptor) {
        return String.format(Locale.ROOT, "%s:%s:%s:%s:%s",
                PREFIX,
                normalize(domain),
                normalize(provider),
                normalize(version),
                descriptor);
    }

    public static String formatCoord(Double value) {
        if (value == null) return "0.0000";
        return String.format(Locale.ROOT, "%.4f", value);
    }

    public static String normalize(String input) {
        return input == null ? "" : input.trim().toLowerCase(Locale.ROOT);
    }

    public static String normalizeUpper(String input) {
        return input == null ? "" : input.trim().toUpperCase(Locale.ROOT);
    }

    public static String sortAndNormalizeCategories(java.util.List<String> categories) {
        if (categories == null || categories.isEmpty()) return "";
        return categories.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .map(s -> s.toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .sorted()
                .collect(Collectors.joining(","));
    }

    public static String sortAndNormalizeCategories(String categories) {
        if (categories == null || categories.isBlank()) return "";
        return Arrays.stream(categories.split(","))
                .map(String::trim)
                .map(s -> s.toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .sorted()
                .collect(Collectors.joining(","));
    }

    public static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            // Fallback for extreme JVM edge case
            return Integer.toHexString(input.hashCode());
        }
    }
}
