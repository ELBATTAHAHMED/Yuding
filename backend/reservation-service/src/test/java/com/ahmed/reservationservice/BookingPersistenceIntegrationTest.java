package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.service.BookingService;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
class BookingPersistenceIntegrationTest {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingService bookingService;

    // Legacy mock beans to prevent application context startup failures
    @MockBean
    private ReservationServices reservationServices;

    @MockBean
    private ReservationRepository reservationRepository;

    @MockBean
    private HebergementsServices hebergementsServices;

    @MockBean
    private TransportsServices transportsServices;

    @MockBean
    private ActiviteesServices activiteesServices;

    @MockBean
    private UtilisateurFeign utilisateurFeign;

    @Test
    @Transactional
    @DisplayName("Persist and reload Booking: validates UUID PK, YUD-XXXXXXXX reference, version and timestamps")
    void persistAndReload_success() {
        UUID userId = UUID.randomUUID();
        Booking draft = bookingService.createDraft(userId, ProductType.FLIGHT);
        UUID bookingId = draft.getId();
        String ref = draft.getBookingReference();

        assertThat(bookingId).isNotNull();
        assertThat(ref).isNotNull().startsWith("YUD-").hasSize(12);
        assertThat(draft.getVersion()).isZero();

        Booking loaded = bookingRepository.findByBookingReference(ref).orElseThrow();
        assertThat(loaded.getId()).isEqualTo(bookingId);
        assertThat(loaded.getUserId()).isEqualTo(userId);
        assertThat(loaded.getProductType()).isEqualTo(ProductType.FLIGHT);
        assertThat(loaded.getStatus()).isEqualTo(BookingStatus.DRAFT);
        assertThat(loaded.getBookingReference()).isEqualTo(ref);
        assertThat(loaded.getCreatedAt()).isNotNull();
        assertThat(loaded.getUpdatedAt()).isNotNull();
        assertThat(loaded.getStatusChangedAt()).isNotNull();
        assertThat(loaded.getExpiresAt()).isNotNull();

        // Perform transition to PENDING_PAYMENT
        Booking pending = bookingService.markPendingPayment(bookingId, userId, false);
        assertThat(pending.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
        assertThat(pending.getBookingReference()).isEqualTo(ref); // Reference preserved
        assertThat(pending.getVersion()).isGreaterThan(0);
    }

    @Test
    @Transactional
    @DisplayName("Unique constraint on booking_reference prevents duplicate reference insertion")
    void uniqueConstraint_preventsDuplicates() {
        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        String duplicateRef = "YUD-DUP23456";
        Instant now = Instant.now();

        Booking b1 = Booking.createDraft(userA, ProductType.HOTEL, duplicateRef, now, null);
        bookingRepository.saveAndFlush(b1);

        Booking b2 = Booking.createDraft(userB, ProductType.TRAIN, duplicateRef, now, null);
        assertThatThrownBy(() -> bookingRepository.saveAndFlush(b2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @Transactional
    @DisplayName("Query by user ID orders bookings descending by creation date")
    void findByUser_ordersDescending() {
        UUID userId = UUID.randomUUID();
        Booking b1 = bookingService.createDraft(userId, ProductType.HOTEL);
        Booking b2 = bookingService.createDraft(userId, ProductType.TRAIN);

        List<Booking> userBookings = bookingRepository.findByUserIdOrderByCreatedAtDesc(userId);
        assertThat(userBookings).hasSizeGreaterThanOrEqualTo(2);
        assertThat(userBookings.get(0).getCreatedAt()).isAfterOrEqualTo(userBookings.get(1).getCreatedAt());
    }

    @Test
    @DisplayName("Optimistic locking detection: Stale update triggers conflict error")
    void optimisticLocking_conflictDetected() {
        UUID userId = UUID.randomUUID();
        Booking draft = bookingService.createDraft(userId, ProductType.ACTIVITY);
        UUID bookingId = draft.getId();

        // Process A updates to PENDING_PAYMENT
        bookingService.markPendingPayment(bookingId, userId, false);

        // Process B (holding original stale copy) attempts an update on the stale instance directly via repository
        assertThatThrownBy(() -> {
            draft.transitionTo(BookingStatus.CANCELLED, Instant.now());
            bookingRepository.saveAndFlush(draft);
        }).isInstanceOf(Exception.class);
    }
}
