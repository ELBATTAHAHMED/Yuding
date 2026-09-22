package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.service.BookingPricingReadinessPolicy;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class BookingPricingReadinessPolicyTest {

    private final Instant fixedNow = Instant.parse("2026-09-22T12:00:00Z");
    private final Clock clock = Clock.fixed(fixedNow, ZoneOffset.UTC);
    private final BookingPricingReadinessPolicy policy = new BookingPricingReadinessPolicy(clock);

    private final UUID bookingId = UUID.randomUUID();
    private final UUID revalidationId = UUID.randomUUID();

    private Booking createBooking(BookingStatus status) {
        return Booking.builder()
                .id(bookingId)
                .userId(UUID.randomUUID())
                .productType(ProductType.FLIGHT)
                .bookingReference("YUD-PRICING1")
                .status(status)
                .build();
    }

    private OfferRevalidation createRevalidation(UUID revalId, Instant validUntil) {
        return OfferRevalidation.builder()
                .id(revalId)
                .bookingId(bookingId)
                .validUntil(validUntil)
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .build();
    }

    private ServerPricingQuote createQuote(UUID revalId, PricingStatus status, BigDecimal total, String curr, Instant validUntil) {
        return ServerPricingQuote.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .revalidationId(revalId)
                .pricingStatus(status)
                .totalAmount(total)
                .currency(curr)
                .validUntil(validUntil)
                .build();
    }

    @Test
    @DisplayName("Readiness: Fresh PRICED quote bound to matching revalidation is payment ready")
    void testPaymentReadyQuote() {
        Booking booking = createBooking(BookingStatus.DRAFT);
        OfferRevalidation reval = createRevalidation(revalidationId, fixedNow.plusSeconds(300));
        ServerPricingQuote quote = createQuote(revalidationId, PricingStatus.PRICED, new BigDecimal("120.00"), "EUR", fixedNow.plusSeconds(300));

        boolean ready = policy.canProceedToPaymentPreparation(booking, quote, reval);
        assertThat(ready).isTrue();
    }

    @Test
    @DisplayName("Readiness: Expired pricing quote is rejected")
    void testExpiredQuoteRejected() {
        Booking booking = createBooking(BookingStatus.DRAFT);
        OfferRevalidation reval = createRevalidation(revalidationId, fixedNow.plusSeconds(300));
        ServerPricingQuote quote = createQuote(revalidationId, PricingStatus.PRICED, new BigDecimal("120.00"), "EUR", fixedNow.minusSeconds(10));

        boolean ready = policy.canProceedToPaymentPreparation(booking, quote, reval);
        assertThat(ready).isFalse();
    }

    @Test
    @DisplayName("Readiness: Quote bound to older revalidation (superseded) is rejected")
    void testSupersededQuoteRejected() {
        Booking booking = createBooking(BookingStatus.DRAFT);
        UUID olderRevalId = UUID.randomUUID();
        UUID newerRevalId = UUID.randomUUID();

        OfferRevalidation latestReval = createRevalidation(newerRevalId, fixedNow.plusSeconds(300));
        ServerPricingQuote quoteBoundToOldReval = createQuote(olderRevalId, PricingStatus.PRICED, new BigDecimal("120.00"), "EUR", fixedNow.plusSeconds(300));

        boolean ready = policy.canProceedToPaymentPreparation(booking, quoteBoundToOldReval, latestReval);
        assertThat(ready).isFalse();
    }

    @Test
    @DisplayName("Readiness: Unpriced offer (NOT_PRICED train) cannot proceed to monetary payment")
    void testNotPricedTrainCannotPay() {
        Booking booking = createBooking(BookingStatus.DRAFT);
        OfferRevalidation reval = createRevalidation(revalidationId, fixedNow.plusSeconds(300));
        ServerPricingQuote quote = createQuote(revalidationId, PricingStatus.NOT_PRICED, null, null, fixedNow.plusSeconds(300));

        boolean ready = policy.canProceedToPaymentPreparation(booking, quote, reval);
        assertThat(ready).isFalse();
    }

    @Test
    @DisplayName("Readiness: Non-DRAFT booking cannot proceed to payment preparation")
    void testNonDraftBookingRejected() {
        Booking booking = createBooking(BookingStatus.CONFIRMED);
        OfferRevalidation reval = createRevalidation(revalidationId, fixedNow.plusSeconds(300));
        ServerPricingQuote quote = createQuote(revalidationId, PricingStatus.PRICED, new BigDecimal("120.00"), "EUR", fixedNow.plusSeconds(300));

        boolean ready = policy.canProceedToPaymentPreparation(booking, quote, reval);
        assertThat(ready).isFalse();
    }
}
