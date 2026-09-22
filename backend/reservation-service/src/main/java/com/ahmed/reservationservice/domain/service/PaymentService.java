package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.PaymentCaptureRequestDto;
import com.ahmed.reservationservice.domain.dto.PaymentCaptureResponseDto;
import com.ahmed.reservationservice.domain.dto.PaymentDetailsDto;
import com.ahmed.reservationservice.domain.dto.PaymentOrderResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentCaptureResult;
import com.ahmed.reservationservice.domain.payment.provider.PaymentOrderCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentOrderResult;
import com.ahmed.reservationservice.domain.payment.provider.PaymentProvider;
import com.ahmed.reservationservice.domain.payment.provider.PaymentProviderRegistry;
import com.ahmed.reservationservice.domain.payment.provider.PaymentRefundCommand;
import com.ahmed.reservationservice.domain.payment.provider.PaymentRefundResult;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Server-authoritative Payment domain service for Yuding V2.
 * Orchestrates payment order creation and capture via provider-neutral PaymentProvider abstraction.
 * Enforces Phase 37 authoritative pricing as the sole amount/currency source.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final ServerPricingQuoteRepository serverPricingQuoteRepository;
    private final OfferRevalidationRepository offerRevalidationRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentProviderRegistry providerRegistry;
    private final PaymentReferenceGenerator paymentReferenceGenerator;
    private final BookingPricingReadinessPolicy pricingReadinessPolicy;
    private final Clock clock = Clock.systemUTC();

    /**
     * Initiates a payment order for the given booking reference.
     * Enforces server-authoritative pricing and zero client price influence.
     */
    @Transactional
    public PaymentOrderResponseDto initiatePaymentOrder(
            String bookingReference,
            String returnUrl,
            String cancelUrl,
            String userId,
            List<String> roles) {

        log.info("PaymentService: Initiating payment order for booking [{}] by user [{}]", bookingReference, userId);

        // 1. Load booking and enforce ownership
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        // 2. Validate booking status eligibility
        if (booking.getStatus() == BookingStatus.PAID || booking.getStatus() == BookingStatus.CONFIRMED) {
            throw new BookingConflictException("Booking " + bookingReference + " is already paid/confirmed.");
        }
        if (booking.getStatus().isTerminal() || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new BookingConflictException("Booking " + bookingReference + " cannot be paid in status: " + booking.getStatus());
        }

        // 3. Load latest ServerPricingQuote and OfferRevalidation
        ServerPricingQuote quote = serverPricingQuoteRepository.findTopByBookingIdOrderByPricedAtDesc(booking.getId())
                .orElseThrow(() -> new BookingConflictException("AUTHORITATIVE_PRICING_REQUIRED: Booking " + bookingReference + " has not been priced by the server."));

        OfferRevalidation latestRevalidation = offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(booking.getId())
                .orElseThrow(() -> new BookingConflictException("REVALIDATION_REQUIRED: No live revalidation found for booking " + bookingReference));

        // 4. Validate readiness policy
        if (quote.getPricingStatus() != PricingStatus.PRICED || quote.getTotalAmount() == null || quote.getTotalAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new BookingConflictException("CANNOT_PAY_UNPRICED: Product cannot be paid because it does not have a positive monetary fare.");
        }

        Instant now = Instant.now(clock);
        if (quote.isExpired(now) || (latestRevalidation.getValidUntil() != null && !now.isBefore(latestRevalidation.getValidUntil()))) {
            throw new BookingConflictException("PRICING_EXPIRED: The pricing quote or revalidation has expired. Please reprice the booking.");
        }

        // 5. Authoritative monetary amounts strictly from ServerPricingQuote
        BigDecimal amount = quote.getTotalAmount();
        String currency = quote.getCurrency();

        // 6. Transition booking to PENDING_PAYMENT if currently DRAFT or PAYMENT_FAILED
        boolean isPrivileged = isPrivileged(roles);
        if (booking.getStatus() == BookingStatus.DRAFT || booking.getStatus() == BookingStatus.PAYMENT_FAILED) {
            booking = bookingService.markPendingPayment(booking.getId(), UUID.fromString(userId), isPrivileged);
        }

        // 7. Check if an active INITIATED payment already exists for this exact pricing quote
        Optional<Payment> existingPaymentOpt = paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(booking.getId());
        if (existingPaymentOpt.isPresent()) {
            Payment existing = existingPaymentOpt.get();
            if (existing.getStatus() == PaymentStatus.INITIATED
                    && quote.getId().equals(existing.getPricingQuoteId())
                    && existing.getProviderOrderId() != null) {
                log.info("PaymentService: Reusing existing initiated payment [ref={}, orderId={}] for booking [{}]",
                        existing.getPaymentReference(), existing.getProviderOrderId(), bookingReference);
                return PaymentOrderResponseDto.builder()
                        .bookingReference(bookingReference)
                        .paymentReference(existing.getPaymentReference())
                        .providerName(existing.getProviderName())
                        .providerOrderId(existing.getProviderOrderId())
                        .approvalUrl(existing.getApprovalUrl())
                        .amount(existing.getAmount())
                        .currency(existing.getCurrency())
                        .status(existing.getStatus().name())
                        .createdAt(existing.getCreatedAt())
                        .build();
            }
        }

        // 8. Generate unique payment reference (PAY-XXXXXXXX)
        String paymentReference = allocateUniquePaymentReference();
        String providerRequestId = "ORD-" + paymentReference;

        // 9. Delegate to active PaymentProvider
        PaymentProvider activeProvider = providerRegistry.getActiveProvider();
        PaymentOrderCommand orderCommand = PaymentOrderCommand.builder()
                .bookingReference(bookingReference)
                .paymentReference(paymentReference)
                .amount(amount)
                .currency(currency)
                .description("Yuding booking " + bookingReference)
                .returnUrl(returnUrl)
                .cancelUrl(cancelUrl)
                .providerRequestId(providerRequestId)
                .build();

        PaymentOrderResult orderResult = activeProvider.createPaymentOrder(orderCommand);

        if (!orderResult.isSuccess()) {
            log.error("PaymentService: Payment provider [{}] failed to create order for booking [{}]: {}",
                    activeProvider.getProviderName(), bookingReference, orderResult.getErrorMessage());

            Payment failedPayment = Payment.builder()
                    .bookingId(booking.getId())
                    .paymentReference(paymentReference)
                    .pricingQuoteId(quote.getId())
                    .providerName(activeProvider.getProviderName())
                    .amount(amount)
                    .currency(currency)
                    .status(PaymentStatus.FAILED)
                    .providerRequestId(providerRequestId)
                    .errorMessage(orderResult.getErrorMessage())
                    .build();
            paymentRepository.save(failedPayment);

            bookingService.markPaymentFailed(booking.getId());
            throw new BookingConflictException("PAYMENT_ORDER_CREATION_FAILED: " + orderResult.getErrorMessage());
        }

        // 10. Persist Payment record
        PaymentStatus initialStatus = orderResult.getApprovalUrl() != null
                ? PaymentStatus.REQUIRES_ACTION
                : PaymentStatus.INITIATED;

        Payment payment = Payment.builder()
                .bookingId(booking.getId())
                .paymentReference(paymentReference)
                .pricingQuoteId(quote.getId())
                .providerName(activeProvider.getProviderName())
                .providerOrderId(orderResult.getProviderOrderId())
                .providerRequestId(providerRequestId)
                .amount(amount)
                .currency(currency)
                .status(initialStatus)
                .approvalUrl(orderResult.getApprovalUrl())
                .clientToken(orderResult.getClientToken())
                .build();

        payment = paymentRepository.save(payment);
        log.info("PaymentService: Successfully created payment [ref={}, provider={}, orderId={}] for booking [{}]",
                paymentReference, activeProvider.getProviderName(), orderResult.getProviderOrderId(), bookingReference);

        return PaymentOrderResponseDto.builder()
                .bookingReference(bookingReference)
                .paymentReference(paymentReference)
                .providerName(activeProvider.getProviderName())
                .providerOrderId(orderResult.getProviderOrderId())
                .approvalUrl(orderResult.getApprovalUrl())
                .amount(amount)
                .currency(currency)
                .status(payment.getStatus().name())
                .createdAt(payment.getCreatedAt())
                .build();
    }

    /**
     * Captures an approved payment order and transitions the Booking to PAID.
     */
    @Transactional
    public PaymentCaptureResponseDto capturePayment(
            String bookingReference,
            PaymentCaptureRequestDto request,
            String userId,
            List<String> roles) {

        log.info("PaymentService: Capturing payment for booking [{}] by user [{}]", bookingReference, userId);

        // 1. Load booking and enforce ownership
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        // 2. Load payment record
        Payment payment;
        if (request != null && request.getPaymentReference() != null && !request.getPaymentReference().isBlank()) {
            payment = paymentRepository.findByPaymentReference(request.getPaymentReference())
                    .orElseThrow(() -> new BookingNotFoundException("Payment not found for reference: " + request.getPaymentReference()));
        } else {
            payment = paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(booking.getId())
                    .orElseThrow(() -> new BookingNotFoundException("No payment found for booking: " + bookingReference));
        }

        // 3. Idempotency: if already SUCCEEDED and booking is PAID
        if (payment.getStatus() == PaymentStatus.SUCCEEDED && booking.getStatus() == BookingStatus.PAID) {
            log.info("PaymentService: Payment [{}] already captured and booking [{}] is PAID (idempotent)",
                    payment.getPaymentReference(), bookingReference);
            return PaymentCaptureResponseDto.builder()
                    .bookingReference(bookingReference)
                    .paymentReference(payment.getPaymentReference())
                    .providerTransactionId(payment.getProviderTransactionId())
                    .paymentStatus(PaymentStatus.SUCCEEDED.name())
                    .bookingStatus(BookingStatus.PAID.name())
                    .amount(payment.getAmount())
                    .currency(payment.getCurrency())
                    .message("Payment already captured successfully.")
                    .build();
        }

        if (payment.getStatus() == PaymentStatus.AWAITING_WEBHOOK) {
            log.info("PaymentService: Payment [{}] is already awaiting webhook confirmation for booking [{}]",
                    payment.getPaymentReference(), bookingReference);
            return PaymentCaptureResponseDto.builder()
                    .bookingReference(bookingReference)
                    .paymentReference(payment.getPaymentReference())
                    .providerTransactionId(payment.getProviderTransactionId())
                    .paymentStatus(PaymentStatus.AWAITING_WEBHOOK.name())
                    .bookingStatus(booking.getStatus().name())
                    .amount(payment.getAmount())
                    .currency(payment.getCurrency())
                    .message("Payment capture already submitted. Awaiting webhook confirmation.")
                    .build();
        }

        // 4. Resolve provider order id
        String providerOrderId = (request != null && request.getProviderOrderId() != null && !request.getProviderOrderId().isBlank())
                ? request.getProviderOrderId()
                : payment.getProviderOrderId();

        if (providerOrderId == null || providerOrderId.isBlank()) {
            throw new BookingConflictException("Missing provider order ID for payment capture.");
        }

        // 5. Execute capture via provider
        String captureRequestId = "CAP-" + payment.getPaymentReference();
        PaymentProvider provider = providerRegistry.getProvider(payment.getProviderName());
        PaymentCaptureCommand captureCommand = PaymentCaptureCommand.builder()
                .providerOrderId(providerOrderId)
                .paymentReference(payment.getPaymentReference())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .providerRequestId(captureRequestId)
                .build();

        PaymentCaptureResult captureResult = provider.capturePaymentOrder(captureCommand);
        Instant now = Instant.now(clock);

        if (captureResult.isSuccess()) {
            // Synchronous capture submitted: record captureId and transition payment to AWAITING_WEBHOOK.
            // DO NOT mark Booking PAID! Final authority belongs strictly to verified webhook (Phase 40).
            payment.setProviderTransactionId(captureResult.getProviderTransactionId());
            payment.setStatus(PaymentStatus.AWAITING_WEBHOOK);
            payment.setUpdatedAt(now);
            paymentRepository.save(payment);

            log.info("PaymentService: Payment [{}] capture submitted (captureId={}) for booking [{}]. Status is AWAITING_WEBHOOK.",
                    payment.getPaymentReference(), captureResult.getProviderTransactionId(), bookingReference);

            return PaymentCaptureResponseDto.builder()
                    .bookingReference(bookingReference)
                    .paymentReference(payment.getPaymentReference())
                    .providerTransactionId(captureResult.getProviderTransactionId())
                    .paymentStatus(PaymentStatus.AWAITING_WEBHOOK.name())
                    .bookingStatus(booking.getStatus().name())
                    .amount(payment.getAmount())
                    .currency(payment.getCurrency())
                    .message("Payment capture submitted successfully. Awaiting trusted webhook confirmation.")
                    .build();
        } else {
            // Failed: mark payment and booking
            payment.markFailed(captureResult.getErrorMessage(), now);
            paymentRepository.save(payment);

            booking = bookingService.markPaymentFailed(booking.getId());

            log.warn("PaymentService: Payment capture failed for booking [{}] ref [{}]: {}",
                    bookingReference, payment.getPaymentReference(), captureResult.getErrorMessage());

            return PaymentCaptureResponseDto.builder()
                    .bookingReference(bookingReference)
                    .paymentReference(payment.getPaymentReference())
                    .paymentStatus(PaymentStatus.FAILED.name())
                    .bookingStatus(booking.getStatus().name())
                    .amount(payment.getAmount())
                    .currency(payment.getCurrency())
                    .message("Payment capture failed: " + captureResult.getErrorMessage())
                    .build();
        }
    }

    /**
     * Retrieves the latest payment details for a booking.
     */
    @Transactional(readOnly = true)
    public PaymentDetailsDto getPaymentDetails(String bookingReference, String userId, List<String> roles) {
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        Payment payment = paymentRepository.findTopByBookingIdOrderByCreatedAtDesc(booking.getId())
                .orElseThrow(() -> new BookingNotFoundException("No payment found for booking " + bookingReference));

        return PaymentDetailsDto.fromEntity(payment, bookingReference);
    }

    private String allocateUniquePaymentReference() {
        for (int i = 0; i < 5; i++) {
            String ref = paymentReferenceGenerator.generate();
            if (!paymentRepository.existsByPaymentReference(ref)) {
                return ref;
            }
        }
        throw new BookingConflictException("Unable to allocate unique payment reference. Please retry.");
    }

    private void validateOwnershipOrAdmin(Booking booking, String userId, List<String> roles) {
        if (isPrivileged(roles)) {
            return;
        }
        if (userId == null || booking.getUserId() == null || !booking.getUserId().toString().equals(userId)) {
            throw new BookingOwnershipException("Access denied: You do not have permission to access booking " + booking.getBookingReference());
        }
    }

    /**
     * Executes a provider-level refund for a captured payment.
     * Protected by stable provider request ID idempotency.
     */
    @Transactional
    public PaymentRefundResult refundPayment(
            String bookingReference,
            String paymentReference,
            BigDecimal amount,
            String currency,
            String reason,
            String userId,
            List<String> roles) {

        log.info("PaymentService: Executing refund for booking [{}] ref [{}] amount [{} {}] by user [{}]",
                bookingReference, paymentReference, amount, currency, userId);

        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        Payment payment = paymentRepository.findByPaymentReference(paymentReference)
                .orElseThrow(() -> new BookingNotFoundException("Payment not found for reference: " + paymentReference));

        if (payment.getProviderTransactionId() == null || payment.getProviderTransactionId().isBlank()) {
            throw new BookingConflictException("CANNOT_REFUND: Payment has no provider capture transaction ID.");
        }

        String refundRequestId = "REF-" + payment.getPaymentReference();
        PaymentProvider provider = providerRegistry.getProvider(payment.getProviderName());

        PaymentRefundCommand command = PaymentRefundCommand.builder()
                .captureId(payment.getProviderTransactionId())
                .paymentReference(payment.getPaymentReference())
                .amount(amount != null ? amount : payment.getAmount())
                .currency(currency != null ? currency : payment.getCurrency())
                .reason(reason)
                .providerRequestId(refundRequestId)
                .build();

        return provider.refundPayment(command);
    }

    private boolean isPrivileged(List<String> roles) {
        return roles != null && (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_SUPPORT"));
    }
}
