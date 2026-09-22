package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OfferSnapshotRepository extends JpaRepository<OfferSnapshot, UUID> {

    Optional<OfferSnapshot> findByBookingId(UUID bookingId);

    Optional<OfferSnapshot> findByBookingBookingReference(String bookingReference);

    boolean existsByBookingId(UUID bookingId);

    boolean existsByBookingBookingReference(String bookingReference);
}
