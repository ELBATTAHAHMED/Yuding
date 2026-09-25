package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.model.*;
import com.ahmed.identityservice.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserLibraryServiceTest {

    @Mock
    private UserFavoriteRepository favoriteRepository;

    @Mock
    private UserSavedTripRepository savedTripRepository;

    @Mock
    private UserRecentSearchRepository recentSearchRepository;

    @Mock
    private UserRecentViewRepository recentViewRepository;

    @Mock
    private TripPlanClient tripPlanClient;

    @InjectMocks
    private UserLibraryService service;

    private UUID userA;
    private UUID userB;

    @BeforeEach
    void setUp() {
        userA = UUID.randomUUID();
        userB = UUID.randomUUID();
    }

    // ====================================================================
    // FAVORITES TESTS
    // ====================================================================

    @Test
    void addFavorite_createsNewFavorite_whenNotAlreadyPresent() {
        FavoriteRequest req = new FavoriteRequest(
                "HOTEL", "HTL-12345", "Riad Atlas", "Marrakech", "https://img.jpg", "Nuitee",
                BigDecimal.valueOf(850.00), "MAD"
        );

        when(favoriteRepository.findByUserIdAndResourceTypeAndResourceReference(userA, "HOTEL", "HTL-12345"))
                .thenReturn(Optional.empty());
        when(favoriteRepository.save(any(UserFavorite.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FavoriteResponse res = service.addFavorite(userA, req);

        assertThat(res).isNotNull();
        assertThat(res.resourceType()).isEqualTo("HOTEL");
        assertThat(res.resourceReference()).isEqualTo("HTL-12345");
        assertThat(res.title()).isEqualTo("Riad Atlas");
        assertThat(res.publicReference()).startsWith("FAV-");
        verify(favoriteRepository).save(any(UserFavorite.class));
    }

    @Test
    void addFavorite_isIdempotent_updatesExistingWhenAlreadyPresent() {
        FavoriteRequest req = new FavoriteRequest(
                "HOTEL", "HTL-12345", "Riad Atlas Updated", "Marrakech", "https://img2.jpg", "Nuitee",
                BigDecimal.valueOf(900.00), "MAD"
        );

        UserFavorite existing = UserFavorite.builder()
                .publicReference("FAV-EXISTING1")
                .userId(userA)
                .resourceType("HOTEL")
                .resourceReference("HTL-12345")
                .title("Riad Atlas")
                .priceSnapshot(BigDecimal.valueOf(850.00))
                .build();

        when(favoriteRepository.findByUserIdAndResourceTypeAndResourceReference(userA, "HOTEL", "HTL-12345"))
                .thenReturn(Optional.of(existing));
        when(favoriteRepository.save(any(UserFavorite.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        FavoriteResponse res = service.addFavorite(userA, req);

        assertThat(res.publicReference()).isEqualTo("FAV-EXISTING1");
        assertThat(res.title()).isEqualTo("Riad Atlas Updated");
        assertThat(res.priceSnapshot()).isEqualTo(BigDecimal.valueOf(900.00));
        verify(favoriteRepository).save(existing);
    }

    @Test
    void addFavorite_rejectsInvalidResourceType() {
        FavoriteRequest req = new FavoriteRequest(
                "UNSUPPORTED_TYPE", "REF-123", "Title", null, null, null, null, null
        );

        assertThatThrownBy(() -> service.addFavorite(userA, req))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Type de ressource favori non pris en charge");
        verify(favoriteRepository, never()).save(any());
    }

    @Test
    void removeFavorite_deletesOnlyOwnedFavorite() {
        UserFavorite fav = UserFavorite.builder()
                .publicReference("FAV-123456789012")
                .userId(userA)
                .build();
        when(favoriteRepository.findByPublicReferenceAndUserId("FAV-123456789012", userA))
                .thenReturn(Optional.of(fav));

        service.removeFavorite(userA, "FAV-123456789012");
        verify(favoriteRepository).delete(fav);
    }

    // ====================================================================
    // SAVED TRIPS TESTS
    // ====================================================================

    @Test
    void saveTrip_savesOwnedPlan_whenVerifiedAgainstTripPlanClient() {
        SavedTripRequest req = new SavedTripRequest("TRP-82QD5J5E");
        TripPlanSummaryDto planDto = new TripPlanSummaryDto(
                "TRP-82QD5J5E", "Voyage Paris", "Casablanca", "Paris",
                LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 20),
                2, BigDecimal.valueOf(8000.00), "MAD", "WITHIN_BUDGET", Instant.now()
        );

        when(savedTripRepository.findByUserIdAndTripPlanReference(userA, "TRP-82QD5J5E"))
                .thenReturn(Optional.empty());
        when(tripPlanClient.getOwnedTripPlan(userA, "TRP-82QD5J5E", "jwt-token"))
                .thenReturn(Optional.of(planDto));
        when(savedTripRepository.save(any(UserSavedTrip.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        SavedTripResponse res = service.saveTrip(userA, req, "jwt-token");

        assertThat(res).isNotNull();
        assertThat(res.tripPlanReference()).isEqualTo("TRP-82QD5J5E");
        assertThat(res.destinationCity()).isEqualTo("Paris");
        assertThat(res.publicReference()).startsWith("STR-");
        verify(savedTripRepository).save(any(UserSavedTrip.class));
    }

    @Test
    void saveTrip_isIdempotent_returnsExistingWithoutDuplicateSave() {
        SavedTripRequest req = new SavedTripRequest("TRP-82QD5J5E");
        UserSavedTrip existing = UserSavedTrip.builder()
                .publicReference("STR-EXISTING12")
                .userId(userA)
                .tripPlanReference("TRP-82QD5J5E")
                .title("Voyage Paris")
                .destinationCity("Paris")
                .originCity("Casablanca")
                .startDate(LocalDate.of(2026, 10, 15))
                .endDate(LocalDate.of(2026, 10, 20))
                .build();

        when(savedTripRepository.findByUserIdAndTripPlanReference(userA, "TRP-82QD5J5E"))
                .thenReturn(Optional.of(existing));

        SavedTripResponse res = service.saveTrip(userA, req, "jwt-token");

        assertThat(res.publicReference()).isEqualTo("STR-EXISTING12");
        verify(tripPlanClient, never()).getOwnedTripPlan(any(), any(), any());
        verify(savedTripRepository, never()).save(any());
    }

    @Test
    void saveTrip_rejectsUnownedOrNonExistentTripPlan() {
        SavedTripRequest req = new SavedTripRequest("TRP-UNOWNED99");

        when(savedTripRepository.findByUserIdAndTripPlanReference(userA, "TRP-UNOWNED99"))
                .thenReturn(Optional.empty());
        when(tripPlanClient.getOwnedTripPlan(userA, "TRP-UNOWNED99", "jwt-token"))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.saveTrip(userA, req, "jwt-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Plan de voyage introuvable ou non autorisé");
        verify(savedTripRepository, never()).save(any());
    }

    @Test
    void unsaveTrip_removesSavedRelation_withoutDeletingUnderlyingPlan() {
        UserSavedTrip trip = UserSavedTrip.builder()
                .publicReference("STR-123456789012")
                .tripPlanReference("TRP-82QD5J5E")
                .userId(userA)
                .build();
        when(savedTripRepository.findByPublicReferenceAndUserId("STR-123456789012", userA))
                .thenReturn(Optional.of(trip));
        when(savedTripRepository.findByUserIdAndTripPlanReference(userA, "TRP-82QD5J5E"))
                .thenReturn(Optional.of(trip));

        service.unsaveTrip(userA, "STR-123456789012");
        verify(savedTripRepository).delete(trip);

        service.unsaveTrip(userA, "TRP-82QD5J5E");
        verify(savedTripRepository, times(2)).delete(trip);
    }

    // ====================================================================
    // RECENT SEARCHES TESTS
    // ====================================================================

    @Test
    void recordRecentSearch_stripsInjectedFields_andComputesDeterministicHash() {
        Map<String, Object> maliciousPayload = new HashMap<>();
        maliciousPayload.put("origin", "CMN");
        maliciousPayload.put("destination", "PAR");
        maliciousPayload.put("travelers", 2);
        maliciousPayload.put("role", "ROLE_ADMIN");
        maliciousPayload.put("userId", "00000000-0000-0000-0000-000000000000");
        maliciousPayload.put("apiKey", "SECRET_KEY");
        maliciousPayload.put("rawProviderPayload", "{...}");

        RecentSearchRequest req = new RecentSearchRequest(
                "FLIGHTS", "CMN", "PAR",
                LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 20),
                2, maliciousPayload
        );

        when(recentSearchRepository.findByUserIdAndSearchTypeAndCriteriaHash(eq(userA), eq("FLIGHTS"), anyString()))
                .thenReturn(Optional.empty());
        when(recentSearchRepository.save(any(UserRecentSearch.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        RecentSearchResponse res = service.recordRecentSearch(userA, req);

        assertThat(res).isNotNull();
        assertThat(res.searchType()).isEqualTo("FLIGHTS");
        assertThat(res.criteriaPayload()).containsKey("origin");
        assertThat(res.criteriaPayload()).containsKey("destination");
        assertThat(res.criteriaPayload()).containsKey("travelers");
        // Verify malicious keys were completely stripped!
        assertThat(res.criteriaPayload()).doesNotContainKey("role");
        assertThat(res.criteriaPayload()).doesNotContainKey("userId");
        assertThat(res.criteriaPayload()).doesNotContainKey("apiKey");
        assertThat(res.criteriaPayload()).doesNotContainKey("rawProviderPayload");
    }

    @Test
    void recordRecentSearch_updatesRecency_onIdenticalSearch() {
        Map<String, Object> payload = Map.of("origin", "CMN", "destination", "RAK");
        RecentSearchRequest req = new RecentSearchRequest(
                "TRAINS", "CMN", "RAK",
                LocalDate.of(2026, 10, 15), null,
                1, payload
        );

        UserRecentSearch existing = UserRecentSearch.builder()
                .publicReference("SRC-PREV123456")
                .userId(userA)
                .searchType("TRAINS")
                .criteriaHash("hash123")
                .origin("CMN")
                .destination("RAK")
                .lastSearchedAt(Instant.now().minusSeconds(3600))
                .build();

        when(recentSearchRepository.findByUserIdAndSearchTypeAndCriteriaHash(eq(userA), eq("TRAINS"), anyString()))
                .thenReturn(Optional.of(existing));
        when(recentSearchRepository.save(any(UserRecentSearch.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        RecentSearchResponse res = service.recordRecentSearch(userA, req);

        assertThat(res.publicReference()).isEqualTo("SRC-PREV123456");
        verify(recentSearchRepository).save(existing);
    }

    @Test
    void clearRecentSearches_deletesOnlyUserSearches() {
        service.clearRecentSearches(userA);
        verify(recentSearchRepository).deleteAllByUserId(userA);
        verify(savedTripRepository, never()).deleteAll();
        verify(favoriteRepository, never()).deleteAll();
    }

    // ====================================================================
    // RECENTLY VIEWED TESTS
    // ====================================================================

    @Test
    void recordRecentView_createsAndDedupesViews() {
        RecentViewRequest req = new RecentViewRequest(
                "HOTEL", "HTL-MRAK1", "La Mamounia", "Marrakech", "https://img.jpg", "Nuitee"
        );

        when(recentViewRepository.findByUserIdAndResourceTypeAndResourceReference(userA, "HOTEL", "HTL-MRAK1"))
                .thenReturn(Optional.empty());
        when(recentViewRepository.save(any(UserRecentView.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        RecentViewResponse res = service.recordRecentView(userA, req);

        assertThat(res).isNotNull();
        assertThat(res.resourceReference()).isEqualTo("HTL-MRAK1");
        assertThat(res.title()).isEqualTo("La Mamounia");
        verify(recentViewRepository).save(any(UserRecentView.class));
    }

    @Test
    void clearRecentViews_deletesOnlyUserViews() {
        service.clearRecentViews(userA);
        verify(recentViewRepository).deleteAllByUserId(userA);
        verify(recentSearchRepository, never()).deleteAllByUserId(any());
    }
}
