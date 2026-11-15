package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.CancellationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface CancellationRequestRepository extends JpaRepository<CancellationRequest, UUID> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from CancellationRequest c where c.id = :id")
    Optional<CancellationRequest> lockById(UUID id);
    Optional<CancellationRequest> findByBookingId(UUID bookingId);
}
