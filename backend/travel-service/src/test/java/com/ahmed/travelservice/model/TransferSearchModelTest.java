package com.ahmed.travelservice.model;

import com.ahmed.travelservice.domain.enums.TransferType;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class TransferSearchModelTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Valid transfer search request passes validation")
    void validTransferRequest() {
        TransferSearchRequest request = TransferSearchRequest.builder()
                .pickup("Marrakech Menara Airport (RAK)")
                .dropoff("Hotel La Mamounia, Marrakech")
                .date(LocalDate.now().plusDays(2))
                .time(LocalTime.of(14, 30))
                .passengers(3)
                .transferType(TransferType.PRIVATE)
                .currency("MAD")
                .build();

        Set<ConstraintViolation<TransferSearchRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Identical pickup and dropoff fails route validation")
    void identicalPickupDropoffFails() {
        TransferSearchRequest request = TransferSearchRequest.builder()
                .pickup("Casablanca Airport")
                .dropoff("casablanca airport")
                .date(LocalDate.now().plusDays(1))
                .time(LocalTime.of(10, 0))
                .passengers(2)
                .build();

        Set<ConstraintViolation<TransferSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Pickup location and dropoff location cannot be identical"));
    }

    @Test
    @DisplayName("Transfer date in the past fails validation")
    void transferDateInPastFails() {
        TransferSearchRequest request = TransferSearchRequest.builder()
                .pickup("Airport")
                .dropoff("City Center")
                .date(LocalDate.now().minusDays(1))
                .time(LocalTime.of(10, 0))
                .passengers(1)
                .build();

        Set<ConstraintViolation<TransferSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Transfer date cannot be in the past"));
    }

    @Test
    @DisplayName("Passengers count 0 fails validation")
    void zeroPassengersFails() {
        TransferSearchRequest request = TransferSearchRequest.builder()
                .pickup("Airport")
                .dropoff("City Center")
                .date(LocalDate.now().plusDays(1))
                .time(LocalTime.of(10, 0))
                .passengers(0)
                .build();

        Set<ConstraintViolation<TransferSearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("At least 1 passenger is required"));
    }
}
