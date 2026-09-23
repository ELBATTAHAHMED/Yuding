package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.BookingConfirmationDto;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ConfirmationState;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.service.ConfirmationProjectionService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.verifyNoMoreInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConfirmationProjectionServiceTest {

    private static final UUID BOOKING_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OWNER_ID = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final String REFERENCE = "YUD-K7M4P2Q8";
    private static final Instant NOW = Instant.parse("2026-09-22T10:15:30Z");

    @Mock
    private BookingRepository bookingRepository;
    @Mock
    private PaymentRepository paymentRepository;
    @Mock
    private OfferSnapshotRepository offerSnapshotRepository;
    @InjectMocks
    private ConfirmationProjectionService confirmationProjectionService;

    @Test
    void projectsEveryBookingAndPaymentStateWithoutWriting() {
        assertProjection(BookingStatus.DRAFT, null, ConfirmationState.AWAITING_PAYMENT);
        assertProjection(BookingStatus.PENDING_PAYMENT, PaymentStatus.AWAITING_WEBHOOK,
                ConfirmationState.PAYMENT_VERIFICATION_PENDING);
        assertProjection(BookingStatus.PENDING_PAYMENT, PaymentStatus.FAILED, ConfirmationState.PAYMENT_FAILED);
        assertProjection(BookingStatus.PAYMENT_FAILED, PaymentStatus.FAILED, ConfirmationState.PAYMENT_FAILED);
        assertProjection(BookingStatus.PAID, PaymentStatus.SUCCEEDED,
                ConfirmationState.PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION);
        assertProjection(BookingStatus.PENDING_PROVIDER_CONFIRMATION, PaymentStatus.SUCCEEDED,
                ConfirmationState.PENDING_PROVIDER_CONFIRMATION);
        assertProjection(BookingStatus.CONFIRMED, PaymentStatus.SUCCEEDED, ConfirmationState.CONFIRMED);
        assertProjection(BookingStatus.CANCELLED, PaymentStatus.SUCCEEDED, ConfirmationState.CANCELLED);
        assertProjection(BookingStatus.REFUNDED, PaymentStatus.REFUNDED, ConfirmationState.REFUNDED);
        assertProjection(BookingStatus.EXPIRED, null, ConfirmationState.EXPIRED);
    }

    @Test
    void paidBookingWithoutWebhookVerifiedPaymentIsNeverPresentedAsConfirmed() {
        assertProjection(BookingStatus.PAID, PaymentStatus.AWAITING_WEBHOOK, ConfirmationState.INCONSISTENT_STATE);
    }

    @Test
    void rejectsAnotherUsersReferenceBeforeReadingPaymentOrSnapshot() {
        Booking booking = booking(OWNER_ID, BookingStatus.PAID);
        UUID attackerId = UUID.randomUUID();
        when(bookingRepository.findByBookingReference(REFERENCE)).thenReturn(Optional.of(booking));

        assertThrows(BookingOwnershipException.class,
                () -> confirmationProjectionService.getConfirmation(REFERENCE, attackerId, false));

        verify(bookingRepository).findByBookingReference(REFERENCE);
        verifyNoMoreInteractions(bookingRepository);
        verifyNoInteractions(paymentRepository, offerSnapshotRepository);
    }

    private void assertProjection(BookingStatus bookingStatus, PaymentStatus paymentStatus, ConfirmationState expectedState) {
        reset(bookingRepository, paymentRepository, offerSnapshotRepository);
        Booking booking = booking(OWNER_ID, bookingStatus);
        when(bookingRepository.findByBookingReference(REFERENCE)).thenReturn(Optional.of(booking));
        when(paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(BOOKING_ID))
                .thenReturn(paymentStatus == null ? Optional.empty() : Optional.of(payment(paymentStatus)));
        when(offerSnapshotRepository.findByBookingId(BOOKING_ID)).thenReturn(Optional.of(snapshot()));

        BookingConfirmationDto projection = confirmationProjectionService.getConfirmation(REFERENCE, OWNER_ID, false);

        assertEquals(expectedState, projection.getConfirmationState());
        assertEquals(REFERENCE, projection.getBookingReference());
        assertEquals("Casablanca → Paris", projection.getProductSummary().get("trajet"));
        assertEquals(false, projection.getProductSummary().containsKey("providerPayload"));
        if (paymentStatus == PaymentStatus.SUCCEEDED) {
            assertEquals(new BigDecimal("249.90"), projection.getAuthoritativeAmount());
            assertEquals(NOW, projection.getPaymentVerifiedAt());
        } else {
            assertNull(projection.getPaymentVerifiedAt());
        }

        verify(bookingRepository).findByBookingReference(REFERENCE);
        verify(paymentRepository).findTopByBookingIdOrderByCreatedAtDesc(BOOKING_ID);
        verify(offerSnapshotRepository).findByBookingId(BOOKING_ID);
        verifyNoMoreInteractions(bookingRepository, paymentRepository, offerSnapshotRepository);
    }

    private static Booking booking(UUID userId, BookingStatus status) {
        return Booking.builder()
                .id(BOOKING_ID)
                .bookingReference(REFERENCE)
                .userId(userId)
                .productType(ProductType.FLIGHT)
                .status(status)
                .createdAt(NOW)
                .updatedAt(NOW)
                .statusChangedAt(NOW)
                .version(0)
                .build();
    }

    private static Payment payment(PaymentStatus status) {
        return Payment.builder()
                .id(UUID.randomUUID())
                .bookingId(BOOKING_ID)
                .paymentReference("PAY-2A3B4C5D")
                .providerName("PAYPAL_SANDBOX")
                .amount(new BigDecimal("249.90"))
                .currency("EUR")
                .status(status)
                .createdAt(NOW)
                .updatedAt(NOW)
                .version(0)
                .build();
    }

    private static OfferSnapshot snapshot() {
        return OfferSnapshot.builder()
                .id(UUID.randomUUID())
                .productType(ProductType.FLIGHT)
                .provider("AMADEUS")
                .providerOfferId("flight-42")
                .selectedDetails(Map.of(
                        "trajet", "Casablanca → Paris",
                        "providerPayload", Map.of("approvalUrl", "https://provider.example/private")
                ))
                .snapshotHash("1234567890123456789012345678901234567890123456789012345678901234")
                .capturedAt(NOW)
                .snapshotExpiresAt(NOW.plusSeconds(900))
                .build();
    }
}
