package com.ahmed.travelservice.model;

import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
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

class ActivitySearchModelTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    @DisplayName("Valid activity search request passes validation")
    void validActivityRequest() {
        ActivitySearchRequest request = ActivitySearchRequest.builder()
                .destination("Marrakech, Morocco")
                .date(LocalDate.now().plusDays(3))
                .travelers(2)
                .category("CULTURE")
                .radiusKm(30)
                .currency("MAD")
                .build();

        Set<ConstraintViolation<ActivitySearchRequest>> violations = validator.validate(request);
        assertThat(violations).isEmpty();
    }

    @Test
    @DisplayName("Blank destination fails validation")
    void blankDestinationFails() {
        ActivitySearchRequest request = ActivitySearchRequest.builder()
                .destination("")
                .travelers(1)
                .build();

        Set<ConstraintViolation<ActivitySearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Destination is required"));
    }

    @Test
    @DisplayName("Travelers less than 1 fails validation")
    void zeroTravelersFails() {
        ActivitySearchRequest request = ActivitySearchRequest.builder()
                .destination("Agadir")
                .travelers(0)
                .build();

        Set<ConstraintViolation<ActivitySearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("At least 1 traveler is required"));
    }

    @Test
    @DisplayName("Radius greater than 100km fails validation")
    void excessiveRadiusFails() {
        ActivitySearchRequest request = ActivitySearchRequest.builder()
                .destination("Tangier")
                .travelers(2)
                .radiusKm(150)
                .build();

        Set<ConstraintViolation<ActivitySearchRequest>> violations = validator.validate(request);
        assertThat(violations).anyMatch(v -> v.getMessage().contains("Radius cannot exceed 100 km"));
    }
}
