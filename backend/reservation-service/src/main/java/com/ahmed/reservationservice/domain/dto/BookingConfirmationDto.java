package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ConfirmationState;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

/**
 * Safe, read-only receipt projection. Internal IDs, provider payloads, and payment secrets
 * are intentionally absent; all monetary values originate from the persisted Payment record.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingConfirmationDto {
    private String bookingReference;
    private BookingStatus bookingStatus;
    private ProductType productType;
    private ConfirmationState confirmationState;

    private String paymentReference;
    private PaymentStatus paymentStatus;
    private String paymentProvider;
    private BigDecimal authoritativeAmount;
    private String currency;

    private Instant createdAt;
    private Instant paymentVerifiedAt;
    private Map<String, Object> productSummary;
}
