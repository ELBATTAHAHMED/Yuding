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
        String type = switch (booking.getProductType()) {
            case HOTEL -> "ACCOMMODATION";
            case ACTIVITY -> "ACTIVITY";
            case FLIGHT -> "FLIGHT";
            case TRANSFER -> "TRANSFER";
            case TRAIN -> "TRAIN";
        };
        String provider = snapshot == null ? null : snapshot.getProvider();
        String entityRef = snapshot == null ? null
                : "ACCOMMODATION".equals(type) ? string(details.get("hotelId")) : string(snapshot.getProviderOfferId());
        String name = switch (booking.getProductType()) {
            case HOTEL -> string(details.get("hotelName"));
            case ACTIVITY -> label(string(details.get("title")), string(details.get("city")));
            case FLIGHT -> label(route(string(details.get("origin")), string(details.get("destination"))),
                    string(details.get("departureTime")) == null ? null
                            : string(details.get("departureTime")).substring(0, Math.min(10, string(details.get("departureTime")).length())));
            case TRANSFER -> route(string(details.get("pickup")), string(details.get("dropoff")));
            case TRAIN -> label(string(details.get("routeName")) == null
                    ? route(string(details.get("originStation")), string(details.get("destinationStation")))
                    : string(details.get("routeName")), string(details.get("departureDate")));
        };
        ReviewEligibilityDto denied = new ReviewEligibilityDto(booking.getBookingReference(), booking.getId(), false,
                "NOT_COMPLETED", type, provider, entityRef, name);
        if (provider == null || provider.isBlank() || "UNKNOWN".equalsIgnoreCase(provider)
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
        String endValue = switch (booking.getProductType()) {
            case HOTEL -> string(details.get("checkOut"));
            case ACTIVITY, TRANSFER -> string(details.get("date"));
            case FLIGHT -> string(details.get("arrivalTime")) != null
                    ? string(details.get("arrivalTime")) : string(details.get("departureTime"));
            case TRAIN -> string(details.get("departureDate"));
        };
        LocalDate end;
        try { end = LocalDate.parse(endValue.substring(0, 10)); } catch (Exception ex) { return denied; }
        if (!LocalDate.now(TRAVEL_ZONE).isAfter(end)) return denied;
        return new ReviewEligibilityDto(booking.getBookingReference(), booking.getId(), true,
                "TRIP_COMPLETED", type, provider, entityRef, name);
    }

    private static String string(Object value) {
        return value instanceof String text && !text.isBlank() ? text.trim() : null;
    }

    private static String label(String first, String second) {
        if (first == null) return second;
        return second == null ? first : first + " " + second;
    }

    private static String route(String origin, String destination) {
        if (origin == null) return destination;
        return destination == null ? origin : origin + " → " + destination;
    }
}
