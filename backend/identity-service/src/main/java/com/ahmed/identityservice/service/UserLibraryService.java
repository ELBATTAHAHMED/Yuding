package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.model.*;
import com.ahmed.identityservice.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserLibraryService {

    private static final Set<String> FAVORITE_RESOURCE_TYPES = Set.of("HOTEL", "ACTIVITY", "DESTINATION", "FLIGHT", "TRANSFER", "TRAIN");
    private static final Set<String> SEARCH_TYPES = Set.of(
            "FLIGHT", "HOTEL", "ACTIVITY", "TRIP", "TRANSFER", "TRAIN",
            "FLIGHTS", "HOTELS", "ACTIVITIES", "TRANSFERS", "TRAINS"
    );
    private static final Set<String> VIEW_RESOURCE_TYPES = Set.of("HOTEL", "ACTIVITY", "DESTINATION");

    private static final Map<String, String> CANONICAL_ALLOWED_KEYS;
    static {
        Map<String, String> map = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        List<String> keys = List.of(
                "origin", "destination", "departureDate", "returnDate",
                "travelers", "adults", "children", "rooms", "city",
                "originCity", "destinationCity", "travelClass", "startDate", "endDate",
                "preferences", "pace",
                "category", "pickup", "dropoff", "classType", "tripType", "directOnly",
                "budget", "budgetCurrency", "currency", "countryCode", "guestNationality",
                "infants", "occupancies", "time", "passengers", "date", "departureTime",
                "originStation", "destinationStation", "originStationId", "destinationStationId"
        );
        for (String k : keys) {
            map.put(k, k);
        }
        CANONICAL_ALLOWED_KEYS = Collections.unmodifiableMap(map);
    }

    private static final Set<String> FORBIDDEN_SEARCH_KEYS = Set.of(
            "role", "roles", "userid", "user_id", "apikey", "api_key",
            "token", "jwt", "rawproviderpayload", "password", "secret", "credentials"
    );

    private static final int MAX_RECENT_SEARCHES = 20;
    private static final int MAX_RECENT_VIEWS = 30;
    private static final int RETENTION_DAYS = 90;

    private final UserFavoriteRepository favoriteRepository;
    private final UserSavedTripRepository savedTripRepository;
    private final UserRecentSearchRepository recentSearchRepository;
    private final UserRecentViewRepository recentViewRepository;
    private final TripPlanClient tripPlanClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ====================================================================
    // FAVORITES
    // ====================================================================

    @Transactional
    public FavoriteResponse addFavorite(UUID userId, FavoriteRequest request) {
        String type = normalizeType(request.resourceType());
        if (!FAVORITE_RESOURCE_TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de ressource favori non pris en charge: " + request.resourceType());
        }

        String ref = request.resourceReference().trim();
        Optional<UserFavorite> existing = favoriteRepository.findByUserIdAndResourceTypeAndResourceReference(userId, type, ref);

        UserFavorite favorite;
        if (existing.isPresent()) {
            favorite = existing.get();
            favorite.setTitle(request.title().trim());
            favorite.setDestination(request.destination() != null ? request.destination().trim() : null);
            favorite.setThumbnailUrl(request.thumbnailUrl() != null ? request.thumbnailUrl().trim() : null);
            favorite.setProviderLabel(request.providerLabel() != null ? request.providerLabel().trim() : null);
            favorite.setPriceSnapshot(request.priceSnapshot());
            favorite.setCurrencySnapshot(request.currencySnapshot());
            favorite.setCapturedAt(Instant.now());
        } else {
            favorite = UserFavorite.builder()
                    .publicReference(generateRef("FAV"))
                    .userId(userId)
                    .resourceType(type)
                    .resourceReference(ref)
                    .title(request.title().trim())
                    .destination(request.destination() != null ? request.destination().trim() : null)
                    .thumbnailUrl(request.thumbnailUrl() != null ? request.thumbnailUrl().trim() : null)
                    .providerLabel(request.providerLabel() != null ? request.providerLabel().trim() : null)
                    .priceSnapshot(request.priceSnapshot())
                    .currencySnapshot(request.currencySnapshot())
                    .capturedAt(Instant.now())
                    .build();
        }

        return FavoriteResponse.from(favoriteRepository.save(favorite));
    }

    @Transactional(readOnly = true)
    public List<FavoriteResponse> listFavorites(UUID userId) {
        return favoriteRepository.findByUserIdOrderByCreatedAtDesc(userId)
                .stream()
                .map(FavoriteResponse::from)
                .toList();
    }

    @Transactional
    public void removeFavorite(UUID userId, String reference) {
        Optional<UserFavorite> favoriteOpt = favoriteRepository.findByPublicReferenceAndUserId(reference, userId);
        if (favoriteOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Favori introuvable: " + reference);
        }
        favoriteRepository.delete(favoriteOpt.get());
    }

    @Transactional
    public void removeFavoriteByResource(UUID userId, String resourceType, String resourceReference) {
        favoriteRepository.deleteByUserIdAndResourceTypeAndResourceReference(userId, normalizeType(resourceType), resourceReference.trim());
    }

    // ====================================================================
    // SAVED TRIPS
    // ====================================================================

    @Transactional
    public SavedTripResponse saveTrip(UUID userId, SavedTripRequest request, String authToken) {
        String planRef = request.tripPlanReference().trim();

        // Check if already saved
        Optional<UserSavedTrip> existing = savedTripRepository.findByUserIdAndTripPlanReference(userId, planRef);
        if (existing.isPresent()) {
            return SavedTripResponse.from(existing.get());
        }

        // Validate plan ownership against authoritative Trip Planner service
        Optional<TripPlanSummaryDto> planOpt = tripPlanClient.getOwnedTripPlan(userId, planRef, authToken);
        if (planOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Plan de voyage introuvable ou non autorisé: " + planRef);
        }

        TripPlanSummaryDto plan = planOpt.get();
        String destinationCity = (plan.destinationCity() != null && !plan.destinationCity().isBlank())
                ? plan.destinationCity()
                : (plan.title() != null ? plan.title() : "Destination");
        String originCity = (plan.originCity() != null && !plan.originCity().isBlank())
                ? plan.originCity()
                : "Origine";

        UserSavedTrip savedTrip = UserSavedTrip.builder()
                .publicReference(generateRef("STR"))
                .userId(userId)
                .tripPlanReference(planRef)
                .title(plan.title() != null ? plan.title() : "Voyage " + destinationCity)
                .destinationCity(destinationCity)
                .originCity(originCity)
                .startDate(plan.startDate())
                .endDate(plan.endDate())
                .travelersCount(plan.travelersCount() != null ? plan.travelersCount() : 1)
                .budgetAmount(plan.budgetAmount())
                .budgetCurrency(plan.budgetCurrency() != null ? plan.budgetCurrency() : "MAD")
                .planCreatedAt(plan.createdAt())
                .savedAt(Instant.now())
                .build();

        return SavedTripResponse.from(savedTripRepository.save(savedTrip));
    }

    @Transactional(readOnly = true)
    public List<SavedTripResponse> listSavedTrips(UUID userId) {
        return savedTripRepository.findByUserIdOrderBySavedAtDesc(userId)
                .stream()
                .map(SavedTripResponse::from)
                .toList();
    }

    @Transactional
    public void unsaveTrip(UUID userId, String reference) {
        Optional<UserSavedTrip> tripOpt;
        if (reference.startsWith("STR-")) {
            tripOpt = savedTripRepository.findByPublicReferenceAndUserId(reference, userId);
        } else if (reference.startsWith("TRP-")) {
            tripOpt = savedTripRepository.findByUserIdAndTripPlanReference(userId, reference);
        } else {
            tripOpt = savedTripRepository.findByPublicReferenceAndUserId(reference, userId);
        }

        if (tripOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Voyage enregistré introuvable: " + reference);
        }
        savedTripRepository.delete(tripOpt.get());
    }

    // ====================================================================
    // RECENT SEARCHES
    // ====================================================================

    @Transactional
    public RecentSearchResponse recordRecentSearch(UUID userId, RecentSearchRequest request) {
        String searchType = normalizeType(request.searchType());
        if (!SEARCH_TYPES.contains(searchType)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de recherche non pris en charge: " + request.searchType());
        }

        // Sanitize and filter criteria payload (strictly allowlist safe fields)
        Map<String, Object> sanitizedPayload = sanitizeSearchPayload(request.criteriaPayload());
        String origin = request.origin() != null ? request.origin().trim() : (String) sanitizedPayload.get("origin");
        String destination = request.destination() != null ? request.destination().trim() : (String) sanitizedPayload.get("destination");
        LocalDate departureDate = request.departureDate();
        LocalDate returnDate = request.returnDate();
        Integer travelers = request.travelersCount() != null ? request.travelersCount() : 1;

        String criteriaHash = computeCriteriaHash(searchType, origin, destination, departureDate, returnDate, travelers, sanitizedPayload);

        String jsonPayload;
        try {
            jsonPayload = objectMapper.writeValueAsString(sanitizedPayload);
        } catch (Exception e) {
            jsonPayload = "{}";
        }

        Optional<UserRecentSearch> existing = recentSearchRepository.findByUserIdAndSearchTypeAndCriteriaHash(userId, searchType, criteriaHash);

        UserRecentSearch search;
        if (existing.isPresent()) {
            search = existing.get();
            search.setOrigin(origin);
            search.setDestination(destination);
            search.setDepartureDate(departureDate);
            search.setReturnDate(returnDate);
            search.setTravelersCount(travelers);
            search.setCriteriaPayload(jsonPayload);
            search.setLastSearchedAt(Instant.now());
        } else {
            search = UserRecentSearch.builder()
                    .publicReference(generateRef("SRC"))
                    .userId(userId)
                    .searchType(searchType)
                    .criteriaHash(criteriaHash)
                    .origin(origin)
                    .destination(destination)
                    .departureDate(departureDate)
                    .returnDate(returnDate)
                    .travelersCount(travelers)
                    .criteriaPayload(jsonPayload)
                    .lastSearchedAt(Instant.now())
                    .build();
        }

        UserRecentSearch saved = recentSearchRepository.save(search);

        // Retention and capacity pruning
        pruneSearches(userId);

        return RecentSearchResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RecentSearchResponse> listRecentSearches(UUID userId) {
        return recentSearchRepository.findByUserIdOrderByLastSearchedAtDesc(userId)
                .stream()
                .map(RecentSearchResponse::from)
                .toList();
    }

    @Transactional
    public void deleteRecentSearch(UUID userId, String reference) {
        Optional<UserRecentSearch> searchOpt = recentSearchRepository.findByPublicReferenceAndUserId(reference, userId);
        if (searchOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Recherche introuvable: " + reference);
        }
        recentSearchRepository.delete(searchOpt.get());
    }

    @Transactional
    public void clearRecentSearches(UUID userId) {
        recentSearchRepository.deleteAllByUserId(userId);
    }

    // ====================================================================
    // RECENTLY VIEWED
    // ====================================================================

    @Transactional
    public RecentViewResponse recordRecentView(UUID userId, RecentViewRequest request) {
        String type = normalizeType(request.resourceType());
        if (!VIEW_RESOURCE_TYPES.contains(type)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Type de ressource consultée non pris en charge: " + request.resourceType());
        }

        String ref = request.resourceReference().trim();
        Optional<UserRecentView> existing = recentViewRepository.findByUserIdAndResourceTypeAndResourceReference(userId, type, ref);

        UserRecentView view;
        if (existing.isPresent()) {
            view = existing.get();
            view.setTitle(request.title().trim());
            view.setDestination(request.destination() != null ? request.destination().trim() : null);
            view.setThumbnailUrl(request.thumbnailUrl() != null ? request.thumbnailUrl().trim() : null);
            view.setProviderLabel(request.providerLabel() != null ? request.providerLabel().trim() : null);
            view.setLastViewedAt(Instant.now());
        } else {
            view = UserRecentView.builder()
                    .publicReference(generateRef("VIW"))
                    .userId(userId)
                    .resourceType(type)
                    .resourceReference(ref)
                    .title(request.title().trim())
                    .destination(request.destination() != null ? request.destination().trim() : null)
                    .thumbnailUrl(request.thumbnailUrl() != null ? request.thumbnailUrl().trim() : null)
                    .providerLabel(request.providerLabel() != null ? request.providerLabel().trim() : null)
                    .lastViewedAt(Instant.now())
                    .build();
        }

        UserRecentView saved = recentViewRepository.save(view);

        // Retention and capacity pruning
        pruneViews(userId);

        return RecentViewResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public List<RecentViewResponse> listRecentViews(UUID userId) {
        return recentViewRepository.findByUserIdOrderByLastViewedAtDesc(userId)
                .stream()
                .map(RecentViewResponse::from)
                .toList();
    }

    @Transactional
    public void deleteRecentView(UUID userId, String reference) {
        Optional<UserRecentView> viewOpt = recentViewRepository.findByPublicReferenceAndUserId(reference, userId);
        if (viewOpt.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Consultation introuvable: " + reference);
        }
        recentViewRepository.delete(viewOpt.get());
    }

    @Transactional
    public void clearRecentViews(UUID userId) {
        recentViewRepository.deleteAllByUserId(userId);
    }

    // ====================================================================
    // INTERNAL HELPERS & PRUNING
    // ====================================================================

    private void pruneSearches(UUID userId) {
        try {
            Instant cutoff = Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS);
            recentSearchRepository.deleteExpiredSearches(userId, cutoff);
            if (recentSearchRepository.countByUserId(userId) > MAX_RECENT_SEARCHES) {
                recentSearchRepository.pruneExcessSearches(userId, MAX_RECENT_SEARCHES);
            }
        } catch (Exception e) {
            log.warn("Pruning recent searches failed for user {}: {}", userId, e.getMessage());
        }
    }

    private void pruneViews(UUID userId) {
        try {
            Instant cutoff = Instant.now().minus(RETENTION_DAYS, ChronoUnit.DAYS);
            recentViewRepository.deleteExpiredViews(userId, cutoff);
            if (recentViewRepository.countByUserId(userId) > MAX_RECENT_VIEWS) {
                recentViewRepository.pruneExcessViews(userId, MAX_RECENT_VIEWS);
            }
        } catch (Exception e) {
            log.warn("Pruning recent views failed for user {}: {}", userId, e.getMessage());
        }
    }

    private Map<String, Object> sanitizeSearchPayload(Map<String, Object> raw) {
        if (raw == null || raw.isEmpty()) {
            return Collections.emptyMap();
        }
        Map<String, Object> clean = new TreeMap<>();
        for (Map.Entry<String, Object> entry : raw.entrySet()) {
            String key = entry.getKey().trim();
            String keyLower = key.toLowerCase(Locale.ROOT);
            if (FORBIDDEN_SEARCH_KEYS.contains(keyLower)) {
                continue; // Strictly discard injected/auth keys
            }
            if (CANONICAL_ALLOWED_KEYS.containsKey(key) && entry.getValue() != null) {
                String canonicalKey = CANONICAL_ALLOWED_KEYS.get(key);
                if ("occupancies".equals(canonicalKey)) {
                    if (entry.getValue() instanceof List<?> rooms && rooms.size() <= 4) {
                        List<Map<String, Object>> safeRooms = new ArrayList<>();
                        for (Object room : rooms) {
                            if (!(room instanceof Map<?, ?> fields) || !(fields.get("adults") instanceof Number adults)
                                    || adults.intValue() < 1 || adults.intValue() > 10) continue;
                            List<Integer> ages = new ArrayList<>();
                            if (fields.get("childrenAges") instanceof List<?> rawAges) {
                                for (Object age : rawAges) {
                                    if (age instanceof Number number && number.intValue() >= 0 && number.intValue() <= 17 && ages.size() < 8)
                                        ages.add(number.intValue());
                                }
                            }
                            safeRooms.add(Map.of("adults", adults.intValue(), "childrenAges", ages));
                        }
                        if (!safeRooms.isEmpty()) clean.put(canonicalKey, safeRooms);
                    }
                } else {
                    clean.put(canonicalKey, entry.getValue());
                }
            }
        }
        return clean;
    }

    private String computeCriteriaHash(
            String type,
            String origin,
            String destination,
            LocalDate departureDate,
            LocalDate returnDate,
            Integer travelers,
            Map<String, Object> payload
    ) {
        StringBuilder sb = new StringBuilder();
        sb.append(type != null ? type : "").append("|");
        sb.append(origin != null ? origin.toLowerCase(Locale.ROOT) : "").append("|");
        sb.append(destination != null ? destination.toLowerCase(Locale.ROOT) : "").append("|");
        sb.append(departureDate != null ? departureDate.toString() : "").append("|");
        sb.append(returnDate != null ? returnDate.toString() : "").append("|");
        sb.append(travelers != null ? travelers : 1).append("|");

        // Canonical sorted payload
        SortedMap<String, Object> sorted = new TreeMap<>(payload);
        for (Map.Entry<String, Object> e : sorted.entrySet()) {
            sb.append(e.getKey()).append("=").append(e.getValue()).append(";");
        }

        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(sb.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not supported", e);
        }
    }

    private String normalizeType(String type) {
        return type != null ? type.trim().toUpperCase(Locale.ROOT) : "";
    }

    private String generateRef(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12).toUpperCase(Locale.ROOT);
    }
}
