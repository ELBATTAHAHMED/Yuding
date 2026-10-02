package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.CancellationPolicyDto;
import com.ahmed.reservationservice.domain.dto.CancellationStatusDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.payment.provider.*;
import com.ahmed.reservationservice.domain.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

/** Transactional ledger steps surround, but never contain, provider network calls. */
@Service
@RequiredArgsConstructor
@Slf4j
public class CancellationService {
    private final BookingService bookingService;
    private final BookingRepository bookingRepository;
    private final OfferSnapshotRepository snapshotRepository;
    private final PaymentRepository paymentRepository;
    private final CancellationRequestRepository requestRepository;
    private final RefundRecordRepository refundRepository;
    private final CancellationPolicyEngine policyEngine;
    private final CancellationProvider cancellationProvider;
    private final PaymentProviderRegistry paymentProviders;
    private final BookingNotificationDispatcher notifications;
    private final PlatformTransactionManager transactionManager;

    public CancellationPolicyDto policy(String reference, UUID userId, boolean privileged) {
        Booking booking = bookingService.getBookingByReference(reference, userId, privileged);
        if (requestRepository.findByBookingId(booking.getId()).isPresent()) {
            return new CancellationPolicyDto(booking.getBookingReference(), booking.getStatus().name(),
                    false, false, "NOT_APPLICABLE", null, null, null, "EXISTING_REQUEST",
                    "Une demande d'annulation existe déjà pour ce dossier.", null);
        }
        return evaluate(booking);
    }

    public Optional<CancellationStatusDto> status(String reference, UUID userId, boolean privileged) {
        Booking booking = bookingService.getBookingByReference(reference, userId, privileged);
        return statusForBooking(booking);
    }

    public Optional<CancellationStatusDto> statusForBooking(Booking booking) {
        return requestRepository.findByBookingId(booking.getId())
                .map(request -> CancellationStatusDto.from(booking.getBookingReference(), booking.getStatus().name(), request));
    }

    public CancellationStatusDto cancel(String reference, String reason, UUID userId, boolean privileged) {
        String normalizedReason = reason == null ? null : reason.strip().replaceAll("\\s+", " ");
        if (normalizedReason != null && normalizedReason.length() > 500) {
            throw new IllegalArgumentException("La raison ne peut pas dépasser 500 caractères.");
        }
        TransactionTemplate tx = new TransactionTemplate(transactionManager);
        Start start = tx.execute(ignored -> begin(reference, normalizedReason, userId, privileged));
        if (start == null) throw new IllegalStateException("Cancellation transaction did not start");
        if (!start.newRequest()) return current(start.booking().getBookingReference(), userId, privileged);

        CancellationRequest request = start.request();
        log.info("Cancellation [{}] processing booking [{}] provider [{}]", request.getId(),
                start.booking().getId(), request.getProviderName());
        if (!"NOT_APPLICABLE".equals(request.getPolicyType())) {
            CancellationProvider.Result outcome;
            try {
                outcome = cancellationProvider.cancel(start.booking(), start.snapshot(), request.getId());
            } catch (Exception ex) {
                log.warn("Cancellation [{}] demo provider failed: {}", request.getId(), ex.getClass().getSimpleName());
                outcome = new CancellationProvider.Result(false, "YUDING_DEMO", null,
                        "FAILED", "La simulation d'annulation du fournisseur a échoué.");
            }
            if (!outcome.success()) {
                CancellationProvider.Result failedOutcome = outcome;
                tx.executeWithoutResult(ignored -> providerFailed(request.getId(), failedOutcome));
                notifySafely(() -> notifications.dispatchCancellationFailed(start.booking()), request.getId());
                return current(start.booking().getBookingReference(), userId, privileged);
            }
            CancellationProvider.Result successfulOutcome = outcome;
            tx.executeWithoutResult(ignored -> providerSucceeded(request.getId(), successfulOutcome));
        } else {
            tx.executeWithoutResult(ignored -> providerSucceeded(request.getId(),
                    new CancellationProvider.Result(true, "YUDING_DEMO", null, "NOT_REQUIRED", "Aucun fournisseur à annuler.")));
        }

        Booking cancelled = bookingRepository.findById(start.booking().getId()).orElseThrow();
        if (request.getRefundAmount() != null && request.getRefundAmount().signum() > 0) {
            Payment payment = succeededPayment(cancelled);
            RefundRecord refund = refundRepository.findByBookingId(cancelled.getId()).orElseThrow();
            PaymentRefundResult outcome;
            try {
                // A provider name is never resolved through the registry's fallback.
                if (!"mock".equalsIgnoreCase(payment.getProviderName())
                        && !"paypal-sandbox".equalsIgnoreCase(payment.getProviderName())) {
                    throw new IllegalStateException("Unsupported sandbox payment provider");
                }
                outcome = paymentProviders.getProvider(payment.getProviderName()).refundPayment(
                        PaymentRefundCommand.builder()
                                .captureId(payment.getProviderTransactionId())
                                .paymentReference(payment.getPaymentReference())
                                .amount(refund.getAmount()).currency(refund.getCurrency())
                                .reason("Yuding demo cancellation")
                                .providerRequestId(refund.getRefundReference()).build());
            } catch (Exception ex) {
                log.warn("Cancellation [{}] refund call failed: {}", request.getId(), ex.getClass().getSimpleName());
                outcome = PaymentRefundResult.failure("Le remboursement sandbox a échoué.");
            }
            PaymentRefundResult refundOutcome = outcome;
            tx.executeWithoutResult(ignored -> finishRefund(request.getId(), refundOutcome));
        }
        CancellationStatusDto finalStatus = current(start.booking().getBookingReference(), userId, privileged);
        Booking finalBooking = bookingRepository.findById(cancelled.getId()).orElseThrow();
        String refundSummary = switch (finalStatus.refundStatus()) {
            case "REFUNDED" -> "Le remboursement de démonstration a été effectué.";
            case "REFUND_FAILED" -> "Le remboursement sandbox a échoué ; consultez votre dossier.";
            case "PENDING", "PROCESSING" -> "Le remboursement sandbox est en cours.";
            default -> "Aucun remboursement n'est applicable.";
        };
        notifySafely(() -> notifications.dispatchBookingCancelled(finalBooking, refundSummary), request.getId());
        if ("REFUNDED".equals(finalStatus.refundStatus())) {
            Payment payment = paymentRepository.findByBookingIdOrderByCreatedAtDesc(cancelled.getId()).stream()
                    .filter(p -> p.getStatus() == PaymentStatus.REFUNDED || p.getStatus() == PaymentStatus.SUCCEEDED)
                    .findFirst().orElseThrow();
            notifySafely(() -> notifications.dispatchRefundCompleted(finalBooking, payment.getPaymentReference(),
                    finalStatus.refundAmount(), finalStatus.currency()), request.getId());
        } else if ("REFUND_FAILED".equals(finalStatus.refundStatus())) {
            notifySafely(() -> notifications.dispatchRefundFailed(finalBooking), request.getId());
        }
        return finalStatus;
    }

    private CancellationStatusDto current(String reference, UUID userId, boolean privileged) {
        return status(reference, userId, privileged).orElseThrow();
    }

    private void notifySafely(Runnable notification, UUID requestId) {
        try {
            notification.run();
        } catch (Exception ex) {
            // A failed dispatch cannot undo the persisted cancellation/refund outcome.
            log.warn("Cancellation [{}] notification dispatch failed: {}", requestId, ex.getClass().getSimpleName());
        }
    }

    private Start begin(String reference, String reason, UUID userId, boolean privileged) {
        Booking owned = bookingService.getBookingByReference(reference, userId, privileged);
        Booking booking = bookingRepository.lockByBookingReference(owned.getBookingReference())
                .orElseThrow(() -> new BookingNotFoundException(reference));
        if (!privileged && !booking.getUserId().equals(userId)) {
            throw new BookingOwnershipException(booking.getId(), userId);
        }
        Optional<CancellationRequest> existing = requestRepository.findByBookingId(booking.getId());
        if (existing.isPresent()) return new Start(booking, null, existing.get(), false);
        CancellationPolicyDto policy = evaluate(booking);
        if (!policy.cancellable()) throw new BookingConflictException(policy.reason());
        CancellationRequest request = new CancellationRequest();
        request.setId(UUID.randomUUID());
        request.setBookingId(booking.getId());
        request.setRequestedBy(userId);
        request.setReason(reason == null || reason.isBlank() ? null : reason);
        request.setStatus("PROCESSING");
        request.setPolicyType(policy.refundType());
        request.setPolicySource(policy.policySource());
        request.setPolicyReason(policy.reason());
        request.setPolicyDeadline(policy.deadline());
        request.setProviderName("YUDING_DEMO");
        request.setRefundStatus(policy.refundable() ? "PENDING" : "NOT_APPLICABLE");
        request.setRefundAmount(policy.refundAmount());
        request.setCancellationFee(policy.cancellationFee());
        request.setCurrency(policy.currency());
        request.setRequestedAt(Instant.now());
        requestRepository.saveAndFlush(request);
        return new Start(booking, snapshotRepository.findByBookingId(booking.getId()).orElse(null), request, true);
    }

    private CancellationPolicyDto evaluate(Booking booking) {
        Payment payment = paymentRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED).findFirst().orElse(null);
        return policyEngine.evaluate(booking,
                snapshotRepository.findByBookingId(booking.getId()).orElse(null), payment);
    }

    private Payment succeededPayment(Booking booking) {
        return paymentRepository.findByBookingIdOrderByCreatedAtDesc(booking.getId()).stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED).findFirst()
                .orElseThrow(() -> new BookingConflictException("No captured payment for refund"));
    }

    private void providerFailed(UUID requestId, CancellationProvider.Result result) {
        CancellationRequest request = requestRepository.findById(requestId).orElseThrow();
        request.setStatus("PROVIDER_FAILED");
        request.setProviderStatus(result.status());
        request.setFailureMessage(result.message());
        request.setRefundStatus("NOT_APPLICABLE");
        request.setProcessedAt(Instant.now());
        requestRepository.save(request);
        log.warn("Cancellation [{}] provider failure, booking [{}] unchanged", requestId, request.getBookingId());
    }

    private void providerSucceeded(UUID requestId, CancellationProvider.Result result) {
        CancellationRequest request = requestRepository.findById(requestId).orElseThrow();
        Booking booking = bookingRepository.findById(request.getBookingId()).orElseThrow();
        if (!"PROCESSING".equals(request.getStatus())) return;
        booking.transitionTo(BookingStatus.CANCELLED, Instant.now());
        booking.updateExpiresAt(null, Instant.now());
        bookingRepository.saveAndFlush(booking);
        request.setStatus("CANCELLED");
        request.setProviderName(result.provider());
        request.setProviderCancellationReference(result.reference());
        request.setProviderStatus(result.status());
        request.setProcessedAt(Instant.now());
        if (request.getRefundAmount() != null && request.getRefundAmount().signum() > 0) {
            Payment payment = succeededPayment(booking);
            BigDecimal amount = request.getRefundAmount();
            if (!payment.getCurrency().equals(request.getCurrency()) || amount.signum() < 0
                    || amount.compareTo(payment.getAmount()) > 0
                    || payment.getProviderTransactionId() == null) {
                throw new BookingConflictException("Invalid authoritative refund amount or currency");
            }
            if (refundRepository.findByBookingId(booking.getId()).isPresent()) {
                throw new BookingConflictException("Refund already exists for this booking");
            }
            RefundRecord refund = new RefundRecord();
            refund.setId(UUID.randomUUID());
            refund.setPaymentId(payment.getId());
            refund.setBookingId(booking.getId());
            refund.setRefundReference("REF-" + booking.getBookingReference());
            refund.setAmount(amount);
            refund.setCurrency(payment.getCurrency());
            refund.setReason("Yuding demo cancellation");
            refund.setStatus("PENDING");
            refund.setRequestedBy(request.getRequestedBy());
            refund.setCreatedAt(Instant.now());
            refund.setUpdatedAt(Instant.now());
            refundRepository.saveAndFlush(refund);
            request.setRefundStatus("PROCESSING");
        } else {
            request.setRefundStatus("NOT_APPLICABLE");
        }
        requestRepository.save(request);
        log.info("Cancellation [{}] provider outcome [{}], booking [{}] CANCELLED", requestId,
                result.status(), booking.getId());
    }

    private void finishRefund(UUID requestId, PaymentRefundResult result) {
        CancellationRequest request = requestRepository.findById(requestId).orElseThrow();
        RefundRecord refund = refundRepository.findByBookingId(request.getBookingId()).orElseThrow();
        if (!"PROCESSING".equals(request.getRefundStatus())) return;
        refund.setProviderRefundId(result.getProviderRefundId());
        refund.setUpdatedAt(Instant.now());
        if (result.isSuccess() && "COMPLETED".equalsIgnoreCase(result.getStatus())) {
            refund.setStatus("SUCCEEDED");
            request.setRefundStatus("REFUNDED");
            request.setRefundedAt(Instant.now());
            Payment payment = paymentRepository.findById(refund.getPaymentId()).orElseThrow();
            if (refund.getAmount().compareTo(payment.getAmount()) == 0) {
                payment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(payment);
                Booking booking = bookingRepository.findById(request.getBookingId()).orElseThrow();
                booking.transitionTo(BookingStatus.REFUNDED, Instant.now());
                bookingRepository.save(booking);
            }
        } else if (result.isSuccess()) {
            refund.setStatus("PENDING");
            request.setRefundStatus("PENDING");
        } else {
            refund.setStatus("FAILED");
            request.setRefundStatus("REFUND_FAILED");
            request.setFailureMessage("Le remboursement sandbox a échoué ; la réservation reste annulée.");
        }
        refundRepository.save(refund);
        requestRepository.save(request);
        log.info("Cancellation [{}] refund outcome [{}]", requestId, request.getRefundStatus());
    }

    private record Start(Booking booking, OfferSnapshot snapshot, CancellationRequest request, boolean newRequest) { }
}
