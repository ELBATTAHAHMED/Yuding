package com.ahmed.travelservice.model;

import com.ahmed.travelservice.dto.request.HotelSearchRequest;
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

class HotelSearchModelTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Valid hotel search request passes validation")
    void validHotelRequest() {
        HotelSearchRequest request = HotelSearchRequest.builder()
                .destination("Marrakech, Morocco")
                .checkIn(LocalDate.now().plusDays(10))
                .checkOut(LocalDate.now().plusDays(15))
                .rooms(1)
                .adults(2)
                .children(1)
                .propertyType("HOTEL")
                .currency("EUR")
                .build();

        Set<ConstraintViolation<HotelSearchRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Blank destination fails validation")
    void blankDestinationFails() {
        HotelSearchRequest request = HotelSearchRequest.builder()
                .destination("   ")
                .checkIn(LocalDate.now().plusDays(2))
                .checkOut(LocalDate.now().plusDays(4))
                .build();

        Set<ConstraintViolation<HotelSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Destination is required"));
    }

    @Test
    @DisplayName("Check-in in the past fails validation")
    void checkInPastFails() {
        HotelSearchRequest request = HotelSearchRequest.builder()
                .destination("Paris")
                .checkIn(LocalDate.now().minusDays(1))
                .checkOut(LocalDate.now().plusDays(2))
                .build();

        Set<ConstraintViolation<HotelSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Check-in date cannot be in the past"));
    }

    @Test
    @DisplayName("Check-out before or on check-in fails validation")
    void checkOutBeforeCheckInFails() {
        HotelSearchRequest request = HotelSearchRequest.builder()
                .destination("Rome")
                .checkIn(LocalDate.now().plusDays(5))
                .checkOut(LocalDate.now().plusDays(5))
                .build();

        Set<ConstraintViolation<HotelSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Check-out date must be strictly after check-in date"));
    }

    @Test
    @DisplayName("Rooms count 0 or > 8 fails validation")
    void invalidRoomsCountFails() {
        HotelSearchRequest request = HotelSearchRequest.builder()
                .destination("London")
                .checkIn(LocalDate.now().plusDays(2))
                .checkOut(LocalDate.now().plusDays(4))
                .rooms(0)
                .build();

        Set<ConstraintViolation<HotelSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("At least 1 room is required"));
    }

    @Test
    @DisplayName("Invalid currency code fails validation")
    void invalidCurrencyFails() {
        HotelSearchRequest request = HotelSearchRequest.builder()
                .destination("Barcelona")
                .checkIn(LocalDate.now().plusDays(2))
                .checkOut(LocalDate.now().plusDays(4))
                .currency("EUROPE")
                .build();

        Set<ConstraintViolation<HotelSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Currency must be a valid 3-letter"));
    }
}
