package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.CancellationPolicyDto;
import com.ahmed.reservationservice.domain.model.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Map;

/** Reads only trusted, persisted supplier metadata and authoritative captured payment. */
@Component
public class CancellationPolicyEngine {
    public CancellationPolicyDto evaluate(Booking booking, OfferSnapshot snapshot, Payment payment) {
        String reference = booking.getBookingReference();
        String state = booking.getStatus().name();
        if (booking.getStatus() == BookingStatus.CANCELLED || booking.getStatus() == BookingStatus.REFUNDED
                || booking.getStatus() == BookingStatus.EXPIRED) {
            return policy(reference, state, false, "NOT_APPLICABLE", null, null, null,
                    "BOOKING_STATE", "Cette réservation ne peut plus être annulée.", null);
        }
        if (booking.getStatus() == BookingStatus.DRAFT || booking.getStatus() == BookingStatus.PENDING_PAYMENT
                || booking.getStatus() == BookingStatus.PAYMENT_FAILED) {
            return policy(reference, state, true, "NOT_APPLICABLE", null, null, null,
                    "UNPAID_BOOKING", "Aucun paiement capturé : aucun remboursement nécessaire.", null);
        }
        if (payment == null || payment.getStatus() != PaymentStatus.SUCCEEDED
                || payment.getAmount() == null || payment.getAmount().signum() <= 0
                || payment.getCurrency() == null || payment.getProviderTransactionId() == null) {
            return policy(reference, state, false, "UNKNOWN", null, null, null,
                    "PAYMENT_RECORD", "Le paiement capturé ne peut pas être vérifié automatiquement.", null);
        }
        BigDecimal paid = payment.getAmount();
        String currency = payment.getCurrency();
        Map<String, Object> details = snapshot != null ? snapshot.getSelectedDetails() : null;
        Map<?, ?> room = details != null && details.get("selectedRoom") instanceof Map<?, ?> selected
                ? selected : null;
        if (room != null && Boolean.FALSE.equals(room.get("refundable"))) {
            return policy(reference, state, true, "NON_REFUNDABLE", BigDecimal.ZERO, paid, currency,
                    "NUITEE_RATE", "Ce tarif de chambre est non remboursable.", null);
        }
        if (room != null && Boolean.TRUE.equals(room.get("refundable"))) {
            Instant deadline = parseDeadline(room.get("cancellationDeadline"));
            if (deadline != null && Instant.now().isBefore(deadline)) {
                return policy(reference, state, true, "FULL", paid, BigDecimal.ZERO, currency,
                        "NUITEE_RATE", "Annulation avant la limite indiquée par le tarif.", deadline);
            }
            return policy(reference, state, false, "UNKNOWN", null, null, currency,
                    "NUITEE_RATE", "Les frais après la limite d'annulation ne sont pas connus.", deadline);
        }
        // Explicit, trusted provider policy. Never parse a human-readable summary as a money rule.
        Map<?, ?> terms = details != null && details.get("cancellationPolicy") instanceof Map<?, ?> value
                ? value : null;
        if (terms != null) {
            if ("PARTIAL".equals(terms.get("type")) && currency.equals(terms.get("currency"))) {
                BigDecimal fee = decimal(terms.get("fee"));
                if (fee != null && fee.signum() >= 0 && fee.compareTo(paid) <= 0) {
                    return policy(reference, state, true, "PARTIAL", paid.subtract(fee), fee, currency,
                            "TRUSTED_PROVIDER_TERMS", "Frais d'annulation indiqués par le fournisseur.", null);
                }
            }
            return policy(reference, state, false, "UNKNOWN", null, null, currency,
                    "INVALID_PROVIDER_TERMS", "Les conditions du fournisseur sont incomplètes ou incohérentes.", null);
        }
        // A mock card pays no real money and carries an explicit Yuding demo policy.
        if ("mock".equalsIgnoreCase(payment.getProviderName())) {
            return policy(reference, state, true, "FULL", paid, BigDecimal.ZERO, currency,
                    "YUDING_DEMO_POLICY", "Remboursement simulé intégral pour le paiement de démonstration.", null);
        }
        return policy(reference, state, false, "UNKNOWN", null, null, currency,
                "PROVIDER_POLICY_UNAVAILABLE", "Les conditions du fournisseur nécessitent une vérification manuelle.", null);
    }

    private CancellationPolicyDto policy(String ref, String status, boolean allowed, String type,
            BigDecimal refund, BigDecimal fee, String currency, String source, String reason, Instant deadline) {
        return new CancellationPolicyDto(ref, status, allowed, refund != null && refund.signum() > 0,
                type, refund, fee, currency, source, reason, deadline);
    }

    private BigDecimal decimal(Object raw) {
        if (raw == null) return null;
        try { return new BigDecimal(raw.toString()); } catch (NumberFormatException ex) { return null; }
    }

    private Instant parseDeadline(Object raw) {
        if (!(raw instanceof String value) || value.isBlank()) return null;
        try { return Instant.parse(value); } catch (Exception ignored) { }
        try { return LocalDateTime.parse(value, DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"))
                .toInstant(ZoneOffset.UTC); } catch (Exception ignored) { return null; }
    }
}
