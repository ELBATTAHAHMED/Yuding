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
public class HotelSearchRequest {

    @NotBlank(message = "Destination is required")
    @Size(min = 2, max = 150, message = "Destination must be between 2 and 150 characters")
    private String destination;

    @NotNull(message = "Check-in date is required")
    @FutureOrPresent(message = "Check-in date cannot be in the past")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate checkIn;

    @NotNull(message = "Check-out date is required")
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate checkOut;

    @NotNull(message = "Rooms count is required")
    @Min(value = 1, message = "At least 1 room is required")
    @Max(value = 8, message = "Maximum 8 rooms allowed per search")
    @Builder.Default
    private Integer rooms = 1;

    @NotNull(message = "Adults count is required")
    @Min(value = 1, message = "At least 1 adult guest is required")
    @Max(value = 30, message = "Maximum 30 adult guests allowed per search")
    @Builder.Default
    private Integer adults = 1;

    @Min(value = 0, message = "Children count cannot be negative")
    @Max(value = 20, message = "Maximum 20 children allowed per search")
    @Builder.Default
    private Integer children = 0;

    @Builder.Default
    private String propertyType = "ALL";

    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be a valid 3-letter uppercase ISO code (e.g. USD, EUR, MAD)")
    @Builder.Default
    private String currency = "EUR";

    // Cross-field validations
    @AssertTrue(message = "Check-out date must be strictly after check-in date")
    public boolean isStayDurationValid() {
        if (checkIn == null || checkOut == null) return true;
        return checkOut.isAfter(checkIn);
    }
}
