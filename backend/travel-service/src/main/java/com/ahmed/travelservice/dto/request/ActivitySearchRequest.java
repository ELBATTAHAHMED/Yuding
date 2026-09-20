package com.ahmed.travelservice.dto.request;

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
public class ActivitySearchRequest {

    @NotBlank(message = "Destination is required")
    @Size(min = 2, max = 150, message = "Destination must be between 2 and 150 characters")
    private String destination;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;

    @NotNull(message = "Travelers count is required")
    @Min(value = 1, message = "At least 1 traveler is required")
    @Max(value = 50, message = "Maximum 50 travelers allowed per booking")
    @Builder.Default
    private Integer travelers = 1;

    @Builder.Default
    private String category = "ALL";

    @Min(value = 1, message = "Radius must be at least 1 km")
    @Max(value = 100, message = "Radius cannot exceed 100 km")
    @Builder.Default
    private Integer radiusKm = 25;

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter uppercase ISO code (e.g. USD, EUR, MAD)")
    @Builder.Default
    private String currency = "EUR";
}
