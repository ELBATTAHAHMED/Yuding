package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.BookingConfirmationDto;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.exception.InvalidBookingReferenceException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ConfirmationState;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

/**
 * Builds the confirmation page's single source of truth without changing booking, payment,
 * pricing, or provider state. In particular, this intentionally does not use the booking read
 * service because that service may evaluate expiry as a lifecycle transition.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConfirmationProjectionService {

    private static final Set<String> SAFE_SUMMARY_FIELDS = Set.of(
            "trajet", "title", "origin", "destination", "departureTime", "arrivalTime", "departureDate",
            "airlineName", "flightNumber", "cabinClass", "stops", "totalDurationMinutes", "durationMinutes",
            "hotelName", "address", "city", "country", "propertyType", "accommodationType", "roomSummary",
            "checkIn", "checkOut", "starRating", "reviewScore", "date", "time", "durationHours", "category",
            "pickup", "dropoff", "transferType", "vehicleModel", "capacity", "originStation",
            "destinationStation", "routeName", "operator", "trainNumber", "stopsCount"
    );

    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final OfferSnapshotRepository offerSnapshotRepository;

    @Transactional(readOnly = true)
    public BookingConfirmationDto getConfirmation(String bookingReference, UUID requestingUserId, boolean privileged) {
        String normalizedReference = BookingReferenceGenerator.normalize(bookingReference);
        if (!BookingReferenceGenerator.isValid(normalizedReference)) {
            throw new InvalidBookingReferenceException(bookingReference);
        }

        Booking booking = bookingRepository.findByBookingReference(normalizedReference)
                .orElseThrow(() -> new BookingNotFoundException(normalizedReference));

        if (!privileged && !booking.getUserId().equals(requestingUserId)) {
            log.warn("Confirmation access denied for booking [{}]", normalizedReference);
            throw new BookingOwnershipException(booking.getId(), requestingUserId);
        }

        Optional<Payment> payment = paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(booking.getId());
        Optional<OfferSnapshot> snapshot = offerSnapshotRepository.findByBookingId(booking.getId());
        ConfirmationState state = projectState(booking, payment.orElse(null));

        return BookingConfirmationDto.builder()
                .bookingReference(booking.getBookingReference())
                .bookingStatus(booking.getStatus())
                .productType(booking.getProductType())
                .confirmationState(state)
                .paymentReference(payment.map(Payment::getPaymentReference).orElse(null))
                .paymentStatus(payment.map(Payment::getStatus).orElse(null))
                .paymentProvider(payment.map(Payment::getProviderName).orElse(null))
                .authoritativeAmount(payment.map(Payment::getAmount).orElse(null))
                .currency(payment.map(Payment::getCurrency).orElse(null))
                .createdAt(booking.getCreatedAt())
                .paymentVerifiedAt(verifiedAt(payment.orElse(null)))
                .productSummary(snapshot.map(OfferSnapshot::getSelectedDetails).map(ConfirmationProjectionService::copySummary).orElse(Map.of()))
                .build();
    }

    private ConfirmationState projectState(Booking booking, Payment payment) {
        BookingStatus bookingStatus = booking.getStatus();
        PaymentStatus paymentStatus = payment != null ? payment.getStatus() : null;

        return switch (bookingStatus) {
            case DRAFT -> ConfirmationState.AWAITING_PAYMENT;
            case PENDING_PAYMENT -> paymentStatus == PaymentStatus.FAILED
                    ? ConfirmationState.PAYMENT_FAILED
                    : ConfirmationState.PAYMENT_VERIFICATION_PENDING;
            case PAYMENT_FAILED -> ConfirmationState.PAYMENT_FAILED;
            case PAID -> successfulPayment(paymentStatus, booking.getBookingReference(), bookingStatus)
                    ? ConfirmationState.PAYMENT_VERIFIED_AWAITING_PROVIDER_CONFIRMATION
                    : ConfirmationState.INCONSISTENT_STATE;
            case PENDING_PROVIDER_CONFIRMATION -> successfulPayment(paymentStatus, booking.getBookingReference(), bookingStatus)
                    ? ConfirmationState.PENDING_PROVIDER_CONFIRMATION
                    : ConfirmationState.INCONSISTENT_STATE;
            case CONFIRMED -> successfulPayment(paymentStatus, booking.getBookingReference(), bookingStatus)
                    ? ConfirmationState.CONFIRMED
                    : ConfirmationState.INCONSISTENT_STATE;
            case CANCELLED -> ConfirmationState.CANCELLED;
            case REFUNDED -> ConfirmationState.REFUNDED;
            case EXPIRED -> ConfirmationState.EXPIRED;
        };
    }

    private boolean successfulPayment(PaymentStatus paymentStatus, String bookingReference, BookingStatus bookingStatus) {
        boolean successful = paymentStatus == PaymentStatus.SUCCEEDED;
        if (!successful) {
            log.warn("Confirmation projection found inconsistent state for booking [{}]: bookingStatus={}, paymentStatus={}",
                    bookingReference, bookingStatus, paymentStatus);
        }
        return successful;
    }

    private static Instant verifiedAt(Payment payment) {
        return payment != null && payment.getStatus() == PaymentStatus.SUCCEEDED
                ? payment.getUpdatedAt()
                : null;
    }

    private static Map<String, Object> copySummary(Map<String, Object> source) {
        if (source == null || source.isEmpty()) {
            return Map.of();
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        source.forEach((key, value) -> {
            if (SAFE_SUMMARY_FIELDS.contains(key) && isDisplayScalar(value)) {
                summary.put(key, value);
            }
        });
        return summary.isEmpty() ? Map.of() : Collections.unmodifiableMap(summary);
    }

    private static boolean isDisplayScalar(Object value) {
        return value instanceof String || value instanceof Number || value instanceof Boolean;
    }
}
