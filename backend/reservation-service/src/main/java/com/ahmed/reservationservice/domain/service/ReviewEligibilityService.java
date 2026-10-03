package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.ReviewEligibilityDto;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.UUID;

/** The booking owner, captured payment, supplier selection and elapsed trip date are authoritative. */
@Service
@RequiredArgsConstructor
public class ReviewEligibilityService {
    private static final ZoneId TRAVEL_ZONE = ZoneId.of("Africa/Casablanca");
    private final BookingService bookings;
    private final OfferSnapshotRepository snapshots;
    private final PaymentRepository payments;

    public ReviewEligibilityDto evaluate(String reference, UUID userId) {
        Booking booking = bookings.getBookingByReference(reference, userId, false);
        OfferSnapshot snapshot = snapshots.findByBookingId(booking.getId()).orElse(null);
        Map<String, Object> details = snapshot == null || snapshot.getSelectedDetails() == null
                ? Map.of() : snapshot.getSelectedDetails();
        String type = booking.getProductType() == ProductType.HOTEL ? "ACCOMMODATION"
                : booking.getProductType() == ProductType.ACTIVITY ? "ACTIVITY" : null;
        String provider = snapshot == null ? null : snapshot.getProvider();
        String entityRef = type == null || snapshot == null ? null
                : "ACCOMMODATION".equals(type) ? string(details.get("hotelId")) : string(snapshot.getProviderOfferId());
        String name = "ACCOMMODATION".equals(type) ? string(details.get("hotelName")) : string(details.get("title"));
        ReviewEligibilityDto denied = new ReviewEligibilityDto(booking.getBookingReference(), booking.getId(), false,
                "NOT_COMPLETED", type, provider, entityRef, name);
        if (type == null || provider == null || provider.isBlank() || "UNKNOWN".equalsIgnoreCase(provider)
                || entityRef == null || entityRef.isBlank() || "UNKNOWN".equalsIgnoreCase(entityRef)) {
            return new ReviewEligibilityDto(booking.getBookingReference(), booking.getId(), false,
                    "NO_STABLE_REVIEW_TARGET", type, provider, entityRef, name);
        }
        Payment payment = payments.findByBookingIdOrderByCreatedAtDesc(booking.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED).findFirst().orElse(null);
        if (payment == null) return denied;
        // Supplier-confirmed bookings qualify after the trip. In the demo, a captured mock
        // payment is the only trusted completion signal available once the selected trip ends.
        boolean trustedState = booking.getStatus() == BookingStatus.CONFIRMED
                || (booking.getStatus() == BookingStatus.PAID && "mock".equalsIgnoreCase(payment.getProviderName()));
        if (!trustedState) return denied;
        String endValue = string(details.get("ACCOMMODATION".equals(type) ? "checkOut" : "date"));
        LocalDate end;
        try { end = LocalDate.parse(endValue); } catch (Exception ex) { return denied; }
        if (!LocalDate.now(TRAVEL_ZONE).isAfter(end)) return denied;
        return new ReviewEligibilityDto(booking.getBookingReference(), booking.getId(), true,
                "TRIP_COMPLETED", type, provider, entityRef, name);
    }

    private static String string(Object value) {
        return value instanceof String text && !text.isBlank() ? text.trim() : null;
    }
}
