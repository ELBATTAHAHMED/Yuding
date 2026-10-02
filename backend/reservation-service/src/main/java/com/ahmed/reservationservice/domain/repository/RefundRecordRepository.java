package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.RefundRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RefundRecordRepository extends JpaRepository<RefundRecord, UUID> {
    Optional<RefundRecord> findByBookingId(UUID bookingId);
}
