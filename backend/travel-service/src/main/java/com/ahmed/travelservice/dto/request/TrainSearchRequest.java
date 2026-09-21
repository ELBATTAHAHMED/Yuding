package com.ahmed.travelservice.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
public class TrainSearchRequest {

    @NotBlank(message = "Origin station is required")
    @Size(min = 2, max = 150, message = "Origin station must be between 2 and 150 characters")
    private String originStation;

    @NotBlank(message = "Destination station is required")
    @Size(min = 2, max = 150, message = "Destination station must be between 2 and 150 characters")
    private String destinationStation;

    @NotNull(message = "Travel date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @JsonFormat(pattern = "HH:mm")
    private LocalTime departureTime;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter uppercase ISO code (e.g. MAD, EUR, USD)")
    @Builder.Default
    private String currency = "MAD";

    @AssertTrue(message = "Origin station and destination station cannot be identical")
    public boolean isRouteValid() {
        if (originStation == null || destinationStation == null) return true;
        return !originStation.trim().equalsIgnoreCase(destinationStation.trim());
    }
}
