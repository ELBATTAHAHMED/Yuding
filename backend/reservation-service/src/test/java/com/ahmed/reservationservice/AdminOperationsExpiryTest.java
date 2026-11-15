package com.ahmed.reservationservice;

import com.ahmed.reservationservice.controllers.AdminOperationsController;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.repository.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.cloud.client.discovery.DiscoveryClient;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AdminOperationsExpiryTest {
    @Test
    void paymentActivityCombinesWebhookAndLedgerEvents() {
        var jdbc = mock(JdbcTemplate.class);
        when(jdbc.queryForList(anyString())).thenReturn(java.util.List.of());
        var controller = new AdminOperationsController(jdbc, mock(BookingRepository.class), mock(OfferSnapshotRepository.class),
                mock(PaymentRepository.class), mock(RefundRecordRepository.class),
                mock(CancellationRequestRepository.class), mock(DiscoveryClient.class));

        controller.apiUsage();

        var queries = ArgumentCaptor.forClass(String.class);
        verify(jdbc, times(3)).queryForList(queries.capture());
        assertTrue(queries.getAllValues().get(2).contains("payment.webhook_events"));
        assertTrue(queries.getAllValues().get(2).contains("payment_lifecycle"));
    }

    @Test
    void flagsOnlyPendingBookingsPastTheirDeadline() {
        var bookings = mock(BookingRepository.class);
        var snapshots = mock(OfferSnapshotRepository.class);
        var controller = new AdminOperationsController(mock(JdbcTemplate.class), bookings, snapshots,
                mock(PaymentRepository.class), mock(RefundRecordRepository.class),
                mock(CancellationRequestRepository.class), mock(DiscoveryClient.class));
        UUID id = UUID.randomUUID();
        Instant past = Instant.now().minusSeconds(60);
        Booking pending = Booking.builder().id(id).productType(ProductType.HOTEL)
                .status(BookingStatus.PENDING_PAYMENT).expiresAt(past).build();
        when(bookings.findById(id)).thenReturn(Optional.of(pending));
        when(snapshots.findByBookingId(id)).thenReturn(Optional.empty());
        assertTrue(controller.booking(id.toString()).isPastDue());

        Booking paid = Booking.builder().id(id).productType(ProductType.HOTEL)
                .status(BookingStatus.PAID).expiresAt(past).build();
        when(bookings.findById(id)).thenReturn(Optional.of(paid));
        assertFalse(controller.booking(id.toString()).isPastDue());

        Booking current = Booking.builder().id(id).productType(ProductType.HOTEL)
                .status(BookingStatus.PENDING_PAYMENT).expiresAt(Instant.now().plusSeconds(60)).build();
        when(bookings.findById(id)).thenReturn(Optional.of(current));
        assertFalse(controller.booking(id.toString()).isPastDue());
    }
}
