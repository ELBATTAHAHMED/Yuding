package com.ahmed.reservationservice.domain.repository;

import com.ahmed.reservationservice.domain.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Spring Data JPA repository for Payment entities in PostgreSQL schema payment.
 */
@Repository
public interface PaymentRepository extends JpaRepository<Payment, UUID> {

    Optional<Payment> findByPaymentReference(String paymentReference);

    Optional<Payment> findTopByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    List<Payment> findByBookingIdOrderByCreatedAtDesc(UUID bookingId);

    Optional<Payment> findByProviderOrderId(String providerOrderId);

    Optional<Payment> findByProviderTransactionId(String providerTransactionId);

    boolean existsByPaymentReference(String paymentReference);
}
