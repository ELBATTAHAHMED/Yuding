package com.ahmed.reservationservice.domain.dto;

import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Public Data Transfer Object representing the finalized server-authoritative pricing quote.
 * Strictly hides internal UUIDs and database identities while exposing authoritative monetary facts.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPricingResponseDto {

    private String bookingReference;
    private String pricingStatus;
    private BigDecimal baseAmount;
    private BigDecimal taxAmount;
    private BigDecimal feeAmount;
    private BigDecimal totalAmount;
    private String currency;
    private boolean breakdownComplete;
    private Instant pricedAt;
    private Instant validUntil;
    private String provider;
    private String productType;
    private boolean canProceedToPayment;
    private String message;

    public static BookingPricingResponseDto fromDomain(
            String bookingReference,
            ServerPricingQuote quote,
            boolean canProceedToPayment,
            String message) {

        if (quote == null) {
            return BookingPricingResponseDto.builder()
                    .bookingReference(bookingReference)
                    .pricingStatus("NOT_PRICED")
                    .breakdownComplete(false)
                    .canProceedToPayment(false)
                    .message(message != null ? message : "No server pricing quote exists for this booking.")
                    .build();
        }

        return BookingPricingResponseDto.builder()
                .bookingReference(bookingReference)
                .pricingStatus(quote.getPricingStatus().name())
                .baseAmount(quote.getBaseAmount())
                .taxAmount(quote.getTaxAmount())
                .feeAmount(quote.getFeeAmount())
                .totalAmount(quote.getTotalAmount())
                .currency(quote.getCurrency())
                .breakdownComplete(quote.isBreakdownComplete())
                .pricedAt(quote.getPricedAt())
                .validUntil(quote.getValidUntil())
                .provider(quote.getProvider())
                .productType(quote.getProductType())
                .canProceedToPayment(canProceedToPayment)
                .message(message)
                .build();
    }
}
