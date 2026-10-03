package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.domain.service.ReviewEligibilityService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReviewEligibilityServiceTest {
    @Mock BookingService bookings;
    @Mock OfferSnapshotRepository snapshots;
    @Mock PaymentRepository payments;
    ReviewEligibilityService service;
    UUID owner = UUID.randomUUID();
    UUID bookingId = UUID.randomUUID();
    String reference = "YUD-ABCDEFGH";

    @BeforeEach void setup() { service = new ReviewEligibilityService(bookings, snapshots, payments); }

    private void arrange(BookingStatus status, String endDate) {
        Booking booking = Booking.builder().id(bookingId).bookingReference(reference).userId(owner)
                .productType(ProductType.HOTEL).status(status).build();
        when(bookings.getBookingByReference(reference, owner, false)).thenReturn(booking);
        when(snapshots.findByBookingId(bookingId)).thenReturn(Optional.of(OfferSnapshot.builder()
                .provider("NUITEE").providerOfferId("rate-1")
                .selectedDetails(Map.of("hotelId", "hotel-123", "hotelName", "Test Hotel", "checkOut", endDate)).build()));
    }

    @Test void completedPaidDemoStayIsEligibleForItsStableHotel() {
        arrange(BookingStatus.PAID, LocalDate.now().minusDays(2).toString());
        when(payments.findByBookingIdOrderByCreatedAtDesc(bookingId)).thenReturn(List.of(
                Payment.builder().status(PaymentStatus.SUCCEEDED).providerName("mock").build()));
        var result = service.evaluate(reference, owner);
        assertThat(result.eligible()).isTrue();
        assertThat(result.entityType()).isEqualTo("ACCOMMODATION");
        assertThat(result.entityReference()).isEqualTo("hotel-123");
    }

    @ParameterizedTest
    @EnumSource(value = ProductType.class, names = {"ACTIVITY", "FLIGHT", "TRANSFER", "TRAIN"})
    void completedPaidTripIsEligibleForEachProduct(ProductType productType) {
        String past = LocalDate.now().minusDays(2).toString();
        Map<String, Object> details = switch (productType) {
            case ACTIVITY -> Map.of("title", "Desert tour", "date", past);
            case FLIGHT -> Map.of("airlineName", "Atlas Air", "flightNumber", "AT123", "origin", "Casablanca", "destination", "Paris",
                    "departureTime", past + "T08:00:00", "arrivalTime", past + "T10:00:00");
            case TRANSFER -> Map.of("pickup", "Airport", "dropoff", "Hotel", "date", past);
            case TRAIN -> Map.of("routeName", "Rabat - Casablanca", "departureDate", past);
            default -> throw new IllegalArgumentException();
        };
        when(bookings.getBookingByReference(reference, owner, false)).thenReturn(Booking.builder()
                .id(bookingId).bookingReference(reference).userId(owner)
                .productType(productType).status(BookingStatus.CONFIRMED).build());
        when(snapshots.findByBookingId(bookingId)).thenReturn(Optional.of(OfferSnapshot.builder()
                .provider("PROVIDER").providerOfferId("offer-1").selectedDetails(details).build()));
        when(payments.findByBookingIdOrderByCreatedAtDesc(bookingId)).thenReturn(List.of(
                Payment.builder().status(PaymentStatus.SUCCEEDED).providerName("live").build()));
        var result = service.evaluate(reference, owner);
        assertThat(result.eligible()).isTrue();
        assertThat(result.entityType()).isEqualTo(productType.name());
        assertThat(result.entityReference()).isEqualTo("offer-1");
        if (productType == ProductType.FLIGHT) assertThat(result.entityName()).contains("Casablanca → Paris");
    }

    @Test void futureOrUnpaidStayIsBlocked() {
        arrange(BookingStatus.PAID, LocalDate.now().plusDays(2).toString());
        when(payments.findByBookingIdOrderByCreatedAtDesc(bookingId)).thenReturn(List.of(
                Payment.builder().status(PaymentStatus.SUCCEEDED).providerName("mock").build()));
        assertThat(service.evaluate(reference, owner).eligible()).isFalse();
    }

    @Test void cancelledStayIsBlockedEvenWithPriorPayment() {
        arrange(BookingStatus.CANCELLED, LocalDate.now().minusDays(2).toString());
        when(payments.findByBookingIdOrderByCreatedAtDesc(bookingId)).thenReturn(List.of(
                Payment.builder().status(PaymentStatus.SUCCEEDED).providerName("mock").build()));
        assertThat(service.evaluate(reference, owner).eligible()).isFalse();
    }

    @Test void anotherUsersBookingCannotBeInspected() {
        UUID stranger = UUID.randomUUID();
        when(bookings.getBookingByReference(reference, stranger, false))
                .thenThrow(new BookingOwnershipException(bookingId, stranger));
        assertThatThrownBy(() -> service.evaluate(reference, stranger)).isInstanceOf(BookingOwnershipException.class);
        verifyNoInteractions(snapshots, payments);
    }
}
