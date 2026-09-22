package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Booking aggregate root.
 */
@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    List<Booking> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);

    List<Booking> findByStatusInAndExpiresAtBefore(Collection<BookingStatus> statuses, Instant now);
}
