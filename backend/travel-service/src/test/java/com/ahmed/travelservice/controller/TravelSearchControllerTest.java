package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
class TravelSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("POST /travel/flights/search succeeds with valid request and returns PROVIDER_UNAVAILABLE status")
    void searchFlightsSuccess() throws Exception {
        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(7))
                .returnDate(LocalDate.now().plusDays(14))
                .adults(2)
                .children(0)
                .infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false)
                .currency("EUR")
                .build();

        mockMvc.perform(post("/travel/flights/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.searchId").isString())
                .andExpect(jsonPath("$.message").value(containsString("Phase 21+")));
    }

    @Test
    @DisplayName("POST /travel/flights/search returns 400 Bad Request on invalid request")
    void searchFlightsValidationFailure() throws Exception {
        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Paris (CDG)") // identical route
                .departureDate(LocalDate.now().plusDays(5))
                .adults(0) // invalid adults
                .build();

        mockMvc.perform(post("/travel/flights/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("INVALID_TRAVEL_SEARCH"))
                .andExpect(jsonPath("$.validationErrors").isArray());
    }

    @Test
    @DisplayName("POST /travel/hotels/search succeeds with valid request and returns PROVIDER_UNAVAILABLE status")
    void searchHotelsSuccess() throws Exception {
        HotelSearchRequest req = HotelSearchRequest.builder()
                .destination("Marrakech")
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(10))
                .rooms(1)
                .adults(2)
                .children(0)
                .propertyType("HOTEL")
                .currency("EUR")
                .build();

        mockMvc.perform(post("/travel/hotels/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.message").value(containsString("Phase 21+")));
    }

    @Test
    @DisplayName("POST /travel/activities/search succeeds with valid request and returns PROVIDER_UNAVAILABLE status")
    void searchActivitiesSuccess() throws Exception {
        ActivitySearchRequest req = ActivitySearchRequest.builder()
                .destination("Agadir")
                .date(LocalDate.now().plusDays(3))
                .travelers(2)
                .category("CULTURE")
                .radiusKm(25)
                .currency("EUR")
                .build();

        mockMvc.perform(post("/travel/activities/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.message").value(containsString("Phase 21+")));
    }

    @Test
    @DisplayName("POST /travel/transfers/search succeeds with valid request and returns PROVIDER_UNAVAILABLE status")
    void searchTransfersSuccess() throws Exception {
        TransferSearchRequest req = TransferSearchRequest.builder()
                .pickup("Casablanca Airport")
                .dropoff("Twin Center, Casablanca")
                .date(LocalDate.now().plusDays(2))
                .time(LocalTime.of(12, 0))
                .passengers(2)
                .currency("EUR")
                .build();

        mockMvc.perform(post("/travel/transfers/search")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROVIDER_UNAVAILABLE"))
                .andExpect(jsonPath("$.results").isArray())
                .andExpect(jsonPath("$.results", hasSize(0)))
                .andExpect(jsonPath("$.totalResults").value(0))
                .andExpect(jsonPath("$.message").value(containsString("Phase 21+")));
    }
}
