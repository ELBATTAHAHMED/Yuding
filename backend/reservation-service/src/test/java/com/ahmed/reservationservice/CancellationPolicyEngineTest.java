package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.CancellationPolicyDto;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.service.CancellationPolicyEngine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class CancellationPolicyEngineTest {
    private final CancellationPolicyEngine engine = new CancellationPolicyEngine();
    private final Booking booking = Booking.builder().bookingReference("YUD-K7M4P2Q8")
            .status(BookingStatus.CONFIRMED).productType(ProductType.HOTEL).build();
    private final Payment payment = Payment.builder().status(PaymentStatus.SUCCEEDED)
            .amount(new BigDecimal("850.00")).currency("MAD")
            .providerTransactionId("MOCK-CAPTURE-123").providerName("mock").build();

    @Test
    void unpaidNeedsNoRefundAndTerminalIsRejected() {
        Booking draft = Booking.builder().bookingReference("YUD-K7M4P2Q8").status(BookingStatus.DRAFT).build();
        assertThat(engine.evaluate(draft, null, null).refundType()).isEqualTo("NOT_APPLICABLE");
        Booking cancelled = Booking.builder().bookingReference("YUD-K7M4P2Q8").status(BookingStatus.CANCELLED).build();
        assertThat(engine.evaluate(cancelled, null, null).cancellable()).isFalse();
    }

    @Test
    void providerNonRefundableOverridesDemoCard() {
        CancellationPolicyDto result = engine.evaluate(booking, snapshot(Map.of("selectedRoom", Map.of("refundable", false))), payment);
        assertThat(result.cancellable()).isTrue();
        assertThat(result.refundType()).isEqualTo("NON_REFUNDABLE");
        assertThat(result.refundAmount()).isEqualByComparingTo(BigDecimal.ZERO);
    }

    @Test
    void refundableRateBeforeDeadlineUsesCapturedAmount() {
        CancellationPolicyDto result = engine.evaluate(booking, snapshot(Map.of("selectedRoom", Map.of(
                "refundable", true, "cancellationDeadline", Instant.now().plusSeconds(86400).toString()))), payment);
        assertThat(result.refundType()).isEqualTo("FULL");
        assertThat(result.refundAmount()).isEqualByComparingTo("850.00");
        assertThat(result.currency()).isEqualTo("MAD");
    }

    @Test
    void expiredRateDeadlineIsUnknownInsteadOfFree() {
        CancellationPolicyDto result = engine.evaluate(booking, snapshot(Map.of("selectedRoom", Map.of(
                "refundable", true, "cancellationDeadline", Instant.now().minusSeconds(3600).toString()))), payment);
        assertThat(result.cancellable()).isFalse();
        assertThat(result.refundAmount()).isNull();
    }

    @Test
    void trustedPartialFeeCannotExceedPaidAmount() {
        CancellationPolicyDto partial = engine.evaluate(booking, snapshot(Map.of("cancellationPolicy", Map.of(
                "type", "PARTIAL", "fee", "230.00", "currency", "MAD"))), payment);
        assertThat(partial.refundType()).isEqualTo("PARTIAL");
        assertThat(partial.refundAmount()).isEqualByComparingTo("620.00");
        CancellationPolicyDto invalid = engine.evaluate(booking, snapshot(Map.of("cancellationPolicy", Map.of(
                "type", "PARTIAL", "fee", "900.00", "currency", "MAD"))), payment);
        assertThat(invalid.refundType()).isEqualTo("UNKNOWN");
        assertThat(invalid.cancellable()).isFalse();
    }

    @Test
    void unknownPayPalPolicyIsBlockedAndNoAmountIsInvented() {
        Payment sandbox = Payment.builder().status(PaymentStatus.SUCCEEDED)
                .amount(new BigDecimal("850.00")).currency("MAD")
                .providerTransactionId("SANDBOX-CAPTURE").providerName("paypal-sandbox").build();
        CancellationPolicyDto result = engine.evaluate(booking, null, sandbox);
        assertThat(result.cancellable()).isFalse();
        assertThat(result.refundType()).isEqualTo("UNKNOWN");
        assertThat(result.refundAmount()).isNull();
    }

    private OfferSnapshot snapshot(Map<String, Object> details) {
        return OfferSnapshot.builder().selectedDetails(details).build();
    }
}
