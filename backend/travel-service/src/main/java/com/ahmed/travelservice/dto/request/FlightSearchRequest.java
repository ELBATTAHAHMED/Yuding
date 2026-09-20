package com.ahmed.travelservice.dto.request;

import com.ahmed.travelservice.domain.enums.TravelClass;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FlightSearchRequest {

    @NotBlank(message = "Origin is required")
    @Size(min = 2, max = 100, message = "Origin must be between 2 and 100 characters")
    private String origin;

    @NotBlank(message = "Destination is required")
    @Size(min = 2, max = 100, message = "Destination must be between 2 and 100 characters")
    private String destination;

    @NotNull(message = "Departure date is required")
    @FutureOrPresent(message = "Departure date cannot be in the past")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate departureDate;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate returnDate;

    @NotNull(message = "Adults count is required")
    @Min(value = 1, message = "At least one adult passenger is required")
    @Max(value = 9, message = "Maximum 9 adult passengers allowed per booking")
    @Builder.Default
    private Integer adults = 1;

    @Min(value = 0, message = "Children count cannot be negative")
    @Max(value = 9, message = "Maximum 9 children allowed per booking")
    @Builder.Default
    private Integer children = 0;

    @Min(value = 0, message = "Infants count cannot be negative")
    @Builder.Default
    private Integer infants = 0;

    @Builder.Default
    private TravelClass travelClass = TravelClass.ECONOMY;

    @Builder.Default
    private Boolean nonStop = false;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter uppercase ISO code (e.g. USD, EUR, MAD)")
    @Builder.Default
    private String currency = "EUR";

    // Cross-field validations
    @AssertTrue(message = "Origin and destination cannot be identical")
    public boolean isRouteValid() {
        if (origin == null || destination == null) return true;
        return !origin.trim().equalsIgnoreCase(destination.trim());
    }

    @AssertTrue(message = "Return date must be on or after departure date")
    public boolean isDateRangeValid() {
        if (departureDate == null || returnDate == null) return true;
        return !returnDate.isBefore(departureDate);
    }

    @AssertTrue(message = "Infants count cannot exceed adults count")
    public boolean isInfantCountValid() {
        int ad = adults != null ? adults : 1;
        int inf = infants != null ? infants : 0;
        return inf <= ad;
    }
}
