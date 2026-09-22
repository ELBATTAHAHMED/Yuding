package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OfferRevalidationRepository extends JpaRepository<OfferRevalidation, UUID> {

    /**
     * Finds the latest revalidation record for a specific booking.
     */
    Optional<OfferRevalidation> findTopByBookingIdOrderByRevalidatedAtDesc(UUID bookingId);

    /**
     * Finds all revalidation records for a specific booking in chronological order (latest first).
     */
    List<OfferRevalidation> findByBookingIdOrderByRevalidatedAtDesc(UUID bookingId);
}
