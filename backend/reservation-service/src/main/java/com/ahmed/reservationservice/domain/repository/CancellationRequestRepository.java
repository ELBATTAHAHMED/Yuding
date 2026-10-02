package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.CancellationRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface CancellationRequestRepository extends JpaRepository<CancellationRequest, UUID> {
    Optional<CancellationRequest> findByBookingId(UUID bookingId);
}
