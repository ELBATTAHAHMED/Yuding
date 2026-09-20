package com.ahmed.travelservice.dto.request;

import com.ahmed.travelservice.domain.enums.TransferType;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferSearchRequest {

    @NotBlank(message = "Pickup location is required")
    @Size(min = 2, max = 150, message = "Pickup location must be between 2 and 150 characters")
    private String pickup;

    @NotBlank(message = "Dropoff location is required")
    @Size(min = 2, max = 150, message = "Dropoff location must be between 2 and 150 characters")
    private String dropoff;

    @NotNull(message = "Transfer date is required")
    @FutureOrPresent(message = "Transfer date cannot be in the past")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @NotNull(message = "Transfer time is required")
    @JsonFormat(pattern = "HH:mm")
    private LocalTime time;

    @NotNull(message = "Passengers count is required")
    @Min(value = 1, message = "At least 1 passenger is required")
    @Max(value = 20, message = "Maximum 20 passengers allowed per transfer booking")
    @Builder.Default
    private Integer passengers = 1;

    @Builder.Default
    private TransferType transferType = TransferType.TAXI;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter uppercase ISO code (e.g. USD, EUR, MAD)")
    @Builder.Default
    private String currency = "EUR";

    // Cross-field validations
    @AssertTrue(message = "Pickup location and dropoff location cannot be identical")
    public boolean isRouteValid() {
        if (pickup == null || dropoff == null) return true;
        return !pickup.trim().equalsIgnoreCase(dropoff.trim());
    }
}
