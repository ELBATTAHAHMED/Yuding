package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ServerPricingQuoteRepository extends JpaRepository<ServerPricingQuote, UUID> {

    /**
     * Finds the most recent pricing quote for a booking.
     */
    Optional<ServerPricingQuote> findTopByBookingIdOrderByPricedAtDesc(UUID bookingId);

    /**
     * Finds the exact pricing quote bound to a specific revalidation record.
     */
    Optional<ServerPricingQuote> findByRevalidationId(UUID revalidationId);

    /**
     * Finds all historical pricing quotes for a booking in reverse chronological order.
     */
    List<ServerPricingQuote> findByBookingIdOrderByPricedAtDesc(UUID bookingId);
}
