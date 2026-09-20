package com.ahmed.travelservice.model;

import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class FlightSearchModelTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Valid one-way flight search request passes validation")
    void validOneWayFlightRequest() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(7))
                .adults(1)
                .children(0)
                .infants(0)
                .travelClass(TravelClass.ECONOMY)
                .currency("EUR")
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Valid round-trip flight search request passes validation")
    void validRoundTripFlightRequest() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Madrid (MAD)")
                .destination("Marrakech (RAK)")
                .departureDate(LocalDate.now().plusDays(10))
                .returnDate(LocalDate.now().plusDays(17))
                .adults(2)
                .children(1)
                .infants(1)
                .travelClass(TravelClass.BUSINESS)
                .nonStop(true)
                .currency("MAD")
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Identical origin and destination fails route validation")
    void invalidSameOriginDestination() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Paris (CDG)")
                .departureDate(LocalDate.now().plusDays(5))
                .adults(1)
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Origin and destination cannot be identical"));
    }

    @Test
    @DisplayName("Departure date in the past fails validation")
    void invalidDepartureDateInPast() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().minusDays(1))
                .adults(1)
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Departure date cannot be in the past"));
    }

    @Test
    @DisplayName("Return date before departure date fails validation")
    void invalidReturnDateBeforeDeparture() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(10))
                .returnDate(LocalDate.now().plusDays(5))
                .adults(1)
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Return date must be on or after departure date"));
    }

    @Test
    @DisplayName("Adults count less than 1 fails validation")
    void invalidZeroAdults() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(5))
                .adults(0)
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("At least one adult passenger is required"));
    }

    @Test
    @DisplayName("Infants exceeding adults fails validation")
    void invalidInfantsExceedingAdults() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(5))
                .adults(1)
                .infants(2)
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Infants count cannot exceed adults count"));
    }

    @Test
    @DisplayName("Invalid currency code fails validation")
    void invalidCurrencyCode() {
        FlightSearchRequest request = FlightSearchRequest.builder()
                .origin("Paris (CDG)")
                .destination("Casablanca (CMN)")
                .departureDate(LocalDate.now().plusDays(5))
                .adults(1)
                .currency("EURO") // 4 letters instead of 3
                .build();

        Set<ConstraintViolation<FlightSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Currency must be a valid 3-letter"));
    }
}
