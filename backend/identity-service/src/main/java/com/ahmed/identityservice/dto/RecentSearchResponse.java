package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.UserRecentSearch;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Collections;
import java.util.Map;

public record RecentSearchResponse(
        String publicReference,
        String searchType,
        String origin,
        String destination,
        LocalDate departureDate,
        LocalDate returnDate,
        Integer travelersCount,
        Map<String, Object> criteriaPayload,
        Instant lastSearchedAt,
        Instant createdAt,
        boolean isExpired
) {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static RecentSearchResponse from(UserRecentSearch search) {
        Map<String, Object> payload = Collections.emptyMap();
        if (search.getCriteriaPayload() != null && !search.getCriteriaPayload().isBlank()) {
            try {
                payload = MAPPER.readValue(search.getCriteriaPayload(), new TypeReference<>() {});
            } catch (Exception ignored) {}
        }

        boolean expired = false;
        if (search.getDepartureDate() != null) {
            expired = search.getDepartureDate().isBefore(LocalDate.now());
        }

        return new RecentSearchResponse(
                search.getPublicReference(),
                search.getSearchType(),
                search.getOrigin(),
                search.getDestination(),
                search.getDepartureDate(),
                search.getReturnDate(),
                search.getTravelersCount(),
                payload,
                search.getLastSearchedAt(),
                search.getCreatedAt(),
                expired
        );
    }
}
