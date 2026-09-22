package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BookingReadinessPolicyTest {

    private final Instant fixedNow = Instant.parse("2026-10-15T12:00:00Z");
    private final Clock clock = Clock.fixed(fixedNow, ZoneId.of("UTC"));
    private BookingReadinessPolicy policy;

    @BeforeEach
    void setUp() {
        policy = new BookingReadinessPolicy(clock);
    }

    @Test
    @DisplayName("Fresh revalidation with UNCHANGED price is eligible for server pricing")
    void testFreshUnchangedEligible() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertTrue(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("Fresh revalidation with NOT_APPLICABLE price (e.g. no-fare train) is eligible")
    void testNotApplicablePriceEligible() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("AVAILABLE")
                .priceStatus("NOT_APPLICABLE")
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertTrue(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("Fresh revalidation with CHANGED price without acknowledgement is NOT eligible")
    void testChangedPriceWithoutAckNotEligible() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("AVAILABLE")
                .priceStatus("CHANGED")
                .priceChangeAcceptedAt(null)
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertFalse(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("Fresh revalidation with CHANGED price with explicit acknowledgement IS eligible")
    void testChangedPriceWithAckEligible() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("AVAILABLE")
                .priceStatus("CHANGED")
                .priceChangeAcceptedAt(fixedNow.minusSeconds(10))
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertTrue(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("Expired revalidation cannot proceed even if price was accepted")
    void testExpiredRevalidationCannotProceed() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("AVAILABLE")
                .priceStatus("CHANGED")
                .priceChangeAcceptedAt(fixedNow.minusSeconds(400))
                .validUntil(fixedNow.minusSeconds(100)) // expired
                .build();

        assertFalse(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("UNAVAILABLE status cannot proceed")
    void testUnavailableStatusCannotProceed() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("UNAVAILABLE")
                .priceStatus("NOT_AVAILABLE")
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertFalse(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("REVALIDATION_UNSUPPORTED or UNKNOWN cannot proceed")
    void testUnsupportedOrUnknownCannotProceed() {
        Booking booking = Booking.builder().status(BookingStatus.DRAFT).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("REVALIDATION_UNSUPPORTED")
                .priceStatus("NOT_AVAILABLE")
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertFalse(policy.canProceedToServerPricing(booking, snapshot, reval));
    }

    @Test
    @DisplayName("Non-DRAFT booking cannot proceed to server pricing")
    void testNonDraftCannotProceed() {
        Booking booking = Booking.builder().status(BookingStatus.CONFIRMED).build();
        OfferSnapshot snapshot = OfferSnapshot.builder().build();
        OfferRevalidation reval = OfferRevalidation.builder()
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .validUntil(fixedNow.plusSeconds(300))
                .build();

        assertFalse(policy.canProceedToServerPricing(booking, snapshot, reval));
    }
}
