package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.service.UserLibraryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
@Slf4j
public class UserLibraryController {

    private final UserLibraryService libraryService;

    private UUID userId(Jwt jwt) {
        return UUID.fromString(jwt.getSubject());
    }

    private String token(Jwt jwt) {
        return jwt.getTokenValue();
    }

    // ====================================================================
    // FAVORITES ENDPOINTS
    // ====================================================================

    @GetMapping("/favorites")
    public ResponseEntity<List<FavoriteResponse>> listFavorites(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(libraryService.listFavorites(userId(jwt)));
    }

    @PostMapping("/favorites")
    public ResponseEntity<FavoriteResponse> addFavorite(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody FavoriteRequest request
    ) {
        FavoriteResponse response = libraryService.addFavorite(userId(jwt), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/favorites/{reference}")
    public ResponseEntity<Void> removeFavorite(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String reference
    ) {
        libraryService.removeFavorite(userId(jwt), reference);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/favorites")
    public ResponseEntity<Void> removeFavoriteByResource(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("type") String type,
            @RequestParam("ref") String resourceRef
    ) {
        libraryService.removeFavoriteByResource(userId(jwt), type, resourceRef);
        return ResponseEntity.noContent().build();
    }

    // ====================================================================
    // SAVED TRIPS ENDPOINTS
    // ====================================================================

    @GetMapping("/saved-trips")
    public ResponseEntity<List<SavedTripResponse>> listSavedTrips(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(libraryService.listSavedTrips(userId(jwt)));
    }

    @PostMapping("/saved-trips")
    public ResponseEntity<SavedTripResponse> saveTrip(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SavedTripRequest request
    ) {
        SavedTripResponse response = libraryService.saveTrip(userId(jwt), request, token(jwt));
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/saved-trips/{reference}")
    public ResponseEntity<Void> unsaveTrip(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String reference
    ) {
        libraryService.unsaveTrip(userId(jwt), reference);
        return ResponseEntity.noContent().build();
    }

    // ====================================================================
    // RECENT SEARCHES ENDPOINTS
    // ====================================================================

    @GetMapping("/recent-searches")
    public ResponseEntity<List<RecentSearchResponse>> listRecentSearches(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(libraryService.listRecentSearches(userId(jwt)));
    }

    @PostMapping("/recent-searches")
    public ResponseEntity<RecentSearchResponse> recordRecentSearch(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody RecentSearchRequest request
    ) {
        RecentSearchResponse response = libraryService.recordRecentSearch(userId(jwt), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/recent-searches/{reference}")
    public ResponseEntity<Void> deleteRecentSearch(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String reference
    ) {
        libraryService.deleteRecentSearch(userId(jwt), reference);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/recent-searches")
    public ResponseEntity<Void> clearRecentSearches(@AuthenticationPrincipal Jwt jwt) {
        libraryService.clearRecentSearches(userId(jwt));
        return ResponseEntity.noContent().build();
    }

    // ====================================================================
    // RECENTLY VIEWED ENDPOINTS
    // ====================================================================

    @GetMapping("/recent-views")
    public ResponseEntity<List<RecentViewResponse>> listRecentViews(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(libraryService.listRecentViews(userId(jwt)));
    }

    @PostMapping("/recent-views")
    public ResponseEntity<RecentViewResponse> recordRecentView(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody RecentViewRequest request
    ) {
        RecentViewResponse response = libraryService.recordRecentView(userId(jwt), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/recent-views/{reference}")
    public ResponseEntity<Void> deleteRecentView(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String reference
    ) {
        libraryService.deleteRecentView(userId(jwt), reference);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/recent-views")
    public ResponseEntity<Void> clearRecentViews(@AuthenticationPrincipal Jwt jwt) {
        libraryService.clearRecentViews(userId(jwt));
        return ResponseEntity.noContent().build();
    }
}
