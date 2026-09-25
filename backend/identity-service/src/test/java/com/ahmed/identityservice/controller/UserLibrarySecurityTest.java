package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.dto.*;
import com.ahmed.identityservice.service.UserLibraryService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.jpa.hibernate.ddl-auto=none"
})
class UserLibrarySecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserLibraryService libraryService;

    private final UUID userA = UUID.randomUUID();

    @Test
    @DisplayName("Anonymous access to library endpoints is rejected with 401 Unauthorized")
    void anonymousAccess_rejectedWith401() throws Exception {
        mockMvc.perform(get("/api/account/favorites"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/account/saved-trips"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/account/recent-searches"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/account/recent-views"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Authenticated user can list favorites")
    void authenticatedUser_canListFavorites() throws Exception {
        FavoriteResponse fav = new FavoriteResponse(
                "FAV-123456789012", "HOTEL", "HTL-1", "Hotel Royal", "Paris",
                "https://thumb.jpg", "Nuitee", BigDecimal.valueOf(1200.00), "MAD",
                Instant.now(), Instant.now()
        );
        when(libraryService.listFavorites(userA)).thenReturn(List.of(fav));

        mockMvc.perform(get("/api/account/favorites")
                        .with(jwt().jwt(j -> j.subject(userA.toString()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].publicReference").value("FAV-123456789012"))
                .andExpect(jsonPath("$[0].title").value("Hotel Royal"));
    }

    @Test
    @DisplayName("Authenticated user can add favorite")
    void authenticatedUser_canAddFavorite() throws Exception {
        FavoriteRequest req = new FavoriteRequest(
                "HOTEL", "HTL-1", "Hotel Royal", "Paris",
                "https://thumb.jpg", "Nuitee", BigDecimal.valueOf(1200.00), "MAD"
        );
        FavoriteResponse fav = new FavoriteResponse(
                "FAV-123456789012", "HOTEL", "HTL-1", "Hotel Royal", "Paris",
                "https://thumb.jpg", "Nuitee", BigDecimal.valueOf(1200.00), "MAD",
                Instant.now(), Instant.now()
        );
        when(libraryService.addFavorite(eq(userA), any(FavoriteRequest.class))).thenReturn(fav);

        mockMvc.perform(post("/api/account/favorites")
                        .with(jwt().jwt(j -> j.subject(userA.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.publicReference").value("FAV-123456789012"));
    }

    @Test
    @DisplayName("Authenticated user can save trip")
    void authenticatedUser_canSaveTrip() throws Exception {
        SavedTripRequest req = new SavedTripRequest("TRP-82QD5J5E");
        SavedTripResponse saved = new SavedTripResponse(
                "STR-123456789012", "TRP-82QD5J5E", "Voyage Paris", "Paris", "Casablanca",
                LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 20),
                2, BigDecimal.valueOf(8000.00), "MAD", Instant.now(), Instant.now()
        );
        when(libraryService.saveTrip(eq(userA), any(SavedTripRequest.class), any())).thenReturn(saved);

        mockMvc.perform(post("/api/account/saved-trips")
                        .with(jwt().jwt(j -> j.subject(userA.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.tripPlanReference").value("TRP-82QD5J5E"));
    }

    @Test
    @DisplayName("Authenticated user can record and clear recent searches")
    void authenticatedUser_recentSearches() throws Exception {
        RecentSearchRequest req = new RecentSearchRequest(
                "FLIGHTS", "CMN", "PAR",
                LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 20),
                2, Map.of("origin", "CMN", "destination", "PAR")
        );
        RecentSearchResponse res = new RecentSearchResponse(
                "SRC-123456789012", "FLIGHTS", "CMN", "PAR",
                LocalDate.of(2026, 10, 15), LocalDate.of(2026, 10, 20),
                2, Map.of("origin", "CMN", "destination", "PAR"),
                Instant.now(), Instant.now(), false
        );
        when(libraryService.recordRecentSearch(eq(userA), any(RecentSearchRequest.class))).thenReturn(res);

        mockMvc.perform(post("/api/account/recent-searches")
                        .with(jwt().jwt(j -> j.subject(userA.toString())))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.searchType").value("FLIGHTS"));

        mockMvc.perform(delete("/api/account/recent-searches")
                        .with(jwt().jwt(j -> j.subject(userA.toString()))))
                .andExpect(status().isNoContent());

        verify(libraryService).clearRecentSearches(userA);
    }
}
