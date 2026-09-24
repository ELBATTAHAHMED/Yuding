package com.ahmed.aiservice.domain.planner.service;

import com.ahmed.aiservice.client.InternalTravelClient;
import com.ahmed.aiservice.domain.planner.dto.TripPlanDto;
import com.ahmed.aiservice.domain.planner.dto.TripPlanRequest;
import com.ahmed.aiservice.domain.planner.entity.TripPlanEntity;
import com.ahmed.aiservice.domain.planner.repository.TripPlanDayRepository;
import com.ahmed.aiservice.domain.planner.repository.TripPlanItemRepository;
import com.ahmed.aiservice.domain.planner.repository.TripPlanRepository;
import com.ahmed.aiservice.domain.rag.service.KnowledgeRetrievalService;
import com.ahmed.aiservice.exception.AiProviderException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TripPlannerServiceTest {

    @Mock
    private InternalTravelClient travelClient;

    @Mock
    private KnowledgeRetrievalService knowledgeRetrievalService;

    @Mock
    private TripPlanRepository tripPlanRepository;

    @Mock
    private TripPlanDayRepository tripPlanDayRepository;

    @Mock
    private TripPlanItemRepository tripPlanItemRepository;

    private ObjectMapper objectMapper;
    private TripPlannerService tripPlannerService;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        tripPlannerService = new TripPlannerService(
                travelClient,
                knowledgeRetrievalService,
                tripPlanRepository,
                tripPlanDayRepository,
                tripPlanItemRepository,
                objectMapper
        );
        lenient().when(tripPlanDayRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(tripPlanItemRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    @DisplayName("planTrip generates itinerary within budget with live flights and hotels")
    void planTrip_withinBudget() {
        UUID userId = UUID.randomUUID();
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(4); // 5 days, 4 nights

        TripPlanRequest request = TripPlanRequest.builder()
                .origin("Casablanca")
                .destination("Paris")
                .startDate(start)
                .endDate(end)
                .travelers(2)
                .budget(new BigDecimal("10000.00"))
                .budgetCurrency("MAD")
                .preferences(List.of("museums", "food"))
                .build();

        // Mock flights
        ArrayNode flights = objectMapper.createArrayNode();
        ObjectNode flight1 = flights.addObject();
        flight1.put("id", "FL-101");
        flight1.put("airline", "Air France");
        flight1.put("flightNumber", "AF1497");
        flight1.put("price", "2000.00");
        flight1.put("currency", "MAD");
        when(travelClient.searchFlights(any())).thenReturn(flights);

        // Mock hotels
        ArrayNode hotels = objectMapper.createArrayNode();
        ObjectNode hotel1 = hotels.addObject();
        hotel1.put("id", "HT-201");
        hotel1.put("name", "Hôtel Le Marais");
        hotel1.put("pricePerNight", "800.00");
        hotel1.put("currency", "MAD");
        when(travelClient.searchHotels(any())).thenReturn(hotels);

        // Mock activities
        ArrayNode activities = objectMapper.createArrayNode();
        ObjectNode act1 = activities.addObject();
        act1.put("id", "ACT-301");
        act1.put("name", "Musée du Louvre");
        act1.put("price", "200.00");
        act1.put("currency", "MAD");
        when(travelClient.searchActivities(any())).thenReturn(activities);

        when(tripPlanRepository.save(any(TripPlanEntity.class))).thenAnswer(invocation -> {
            TripPlanEntity entity = invocation.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        TripPlanDto result = tripPlannerService.planTrip(request, userId);

        assertThat(result).isNotNull();
        assertThat(result.getReference()).startsWith("TRP-");
        assertThat(result.getDestination()).isEqualTo("Paris");
        assertThat(result.getBudget()).isEqualByComparingTo("10000.00");
        // Flight: 2000 * 2 = 4000. Hotel: 800 * 4 = 3200. Activities: 200 * 2 = 400. Total = 7600
        assertThat(result.getPricedTotal()).isEqualByComparingTo("7600.00");
        assertThat(result.getRemainingBudget()).isEqualByComparingTo("2400.00");
        assertThat(result.getBudgetStatus()).isEqualTo("WITHIN_BUDGET");
        assertThat(result.getUnpricedItemsCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("planTrip marks OVER_BUDGET when total exceeds budget")
    void planTrip_overBudget() {
        UUID userId = UUID.randomUUID();
        LocalDate start = LocalDate.now().plusDays(10);
        LocalDate end = start.plusDays(3);

        TripPlanRequest request = TripPlanRequest.builder()
                .origin("Casablanca")
                .destination("Paris")
                .startDate(start)
                .endDate(end)
                .travelers(1)
                .budget(new BigDecimal("1000.00")) // Tight budget
                .budgetCurrency("MAD")
                .build();

        // Flight: 2500 MAD (already over budget)
        ArrayNode flights = objectMapper.createArrayNode();
        ObjectNode flight1 = flights.addObject();
        flight1.put("id", "FL-101");
        flight1.put("price", "2500.00");
        flight1.put("currency", "MAD");
        when(travelClient.searchFlights(any())).thenReturn(flights);

        // Hotel: 500 MAD
        ArrayNode hotels = objectMapper.createArrayNode();
        ObjectNode hotel1 = hotels.addObject();
        hotel1.put("id", "HT-201");
        hotel1.put("pricePerNight", "500.00");
        hotel1.put("currency", "MAD");
        when(travelClient.searchHotels(any())).thenReturn(hotels);

        when(tripPlanRepository.save(any(TripPlanEntity.class))).thenAnswer(invocation -> {
            TripPlanEntity entity = invocation.getArgument(0);
            entity.setId(UUID.randomUUID());
            return entity;
        });

        TripPlanDto result = tripPlannerService.planTrip(request, userId);

        assertThat(result.getBudgetStatus()).isEqualTo("OVER_BUDGET");
        assertThat(result.getRemainingBudget()).isNegative();
    }

    @Test
    @DisplayName("planTrip validates missing mandatory destination")
    void planTrip_missingDestination_throwsException() {
        UUID userId = UUID.randomUUID();
        TripPlanRequest request = TripPlanRequest.builder()
                .origin("Casablanca")
                .destination("")
                .startDate(LocalDate.now().plusDays(5))
                .endDate(LocalDate.now().plusDays(10))
                .budget(new BigDecimal("5000"))
                .build();

        assertThatThrownBy(() -> tripPlannerService.planTrip(request, userId))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("destination est obligatoire");
    }

    @Test
    @DisplayName("IDOR protection: getTripPlanByReference throws NOT_FOUND when accessed by different user")
    void getTripPlan_idorProtection() {
        UUID ownerId = UUID.randomUUID();
        UUID attackerId = UUID.randomUUID();
        String ref = "TRP-ABCDEF12";

        when(tripPlanRepository.findByPublicReferenceAndUserId(ref, attackerId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> tripPlannerService.getTripPlanByReference(ref, attackerId))
                .isInstanceOf(AiProviderException.class)
                .hasMessageContaining("introuvable ou non autorisé");
    }
}
