package com.ahmed.reservationservice.controllers;

import com.ahmed.reservationservice.DTO.*;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.RefundRecord;
import com.ahmed.reservationservice.domain.model.CancellationRequest;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.CancellationRequestRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.RefundRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/apir/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
@RequiredArgsConstructor
public class AdminDashboardController {

    private final BookingRepository bookingRepository;
    private final OfferSnapshotRepository offerSnapshotRepository;
    private final PaymentRepository paymentRepository;
    private final RefundRecordRepository refundRecordRepository;
    private final CancellationRequestRepository cancellationRequestRepository;
    private final com.ahmed.reservationservice.domain.service.CancellationService cancellationService;

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        List<Booking> allBookings = bookingRepository.findAll();
        List<Payment> allPayments = paymentRepository.findAll();
        List<RefundRecord> allRefunds = refundRecordRepository.findAll();
        List<CancellationRequest> allCancellations = cancellationRequestRepository.findAll();

        long totalReservations = allBookings.size();
        long totalPayments = allPayments.size();
        long totalRefunds = allRefunds.size();
        long totalCancellations = allCancellations.size();

        double totalRevenue = allPayments.stream()
                .filter(p -> p.getStatus() == PaymentStatus.SUCCEEDED)
                .map(Payment::getAmount)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();

        double totalRefundedAmount = allRefunds.stream()
                .filter(r -> "SUCCEEDED".equalsIgnoreCase(r.getStatus()))
                .map(RefundRecord::getAmount)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();

        Map<String, Long> bookingsByStatus = allBookings.stream()
                .collect(Collectors.groupingBy(b -> b.getStatus().name(), Collectors.counting()));

        Map<String, Long> bookingsByProduct = allBookings.stream()
                .collect(Collectors.groupingBy(b -> b.getProductType().name(), Collectors.counting()));

        Map<String, Long> paymentsByStatus = allPayments.stream()
                .collect(Collectors.groupingBy(p -> p.getStatus().name(), Collectors.counting()));

        Map<String, Long> paymentsByProvider = allPayments.stream()
                .collect(Collectors.groupingBy(Payment::getProviderName, Collectors.counting()));

        AdminStatsDto stats = AdminStatsDto.builder()
                .totalReservations(totalReservations)
                .totalPayments(totalPayments)
                .totalRevenue(totalRevenue)
                .totalRefunds(totalRefunds)
                .totalRefundedAmount(totalRefundedAmount)
                .totalCancellations(totalCancellations)
                .bookingsByStatus(bookingsByStatus)
                .bookingsByProduct(bookingsByProduct)
                .paymentsByStatus(paymentsByStatus)
                .paymentsByProvider(paymentsByProvider)
                .build();

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/bookings")
    public ResponseEntity<PagedResponse<AdminBookingDto>> getBookings(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String productType,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String createdFrom,
            @RequestParam(required = false) String createdTo
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        List<Booking> bookings = bookingRepository.findAll();

        Instant fromInstant = parseInstant(createdFrom);
        Instant toInstant = parseInstant(createdTo);
        String queryLower = (q != null && !q.isBlank()) ? q.trim().toLowerCase() : null;

        List<Booking> filtered = bookings.stream()
                .filter(b -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || b.getStatus().name().equalsIgnoreCase(status))
                .filter(b -> productType == null || productType.isBlank() || "ALL".equalsIgnoreCase(productType) || b.getProductType().name().equalsIgnoreCase(productType))
                .filter(b -> fromInstant == null || (b.getCreatedAt() != null && !b.getCreatedAt().isBefore(fromInstant)))
                .filter(b -> toInstant == null || (b.getCreatedAt() != null && !b.getCreatedAt().isAfter(toInstant)))
                .filter(b -> {
                    if (queryLower == null) return true;
                    return (b.getBookingReference() != null && b.getBookingReference().toLowerCase().contains(queryLower)) ||
                           (b.getUserId() != null && b.getUserId().toString().toLowerCase().contains(queryLower));
                })
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .collect(Collectors.toList());

        // Preload snapshots for amounts & provider info
        List<UUID> bookingIds = filtered.stream().map(Booking::getId).toList();
        Map<UUID, OfferSnapshot> snapshotMap = new HashMap<>();
        for (UUID bId : bookingIds) {
            offerSnapshotRepository.findByBookingId(bId).ifPresent(s -> snapshotMap.put(bId, s));
        }

        List<AdminBookingDto> dtos = filtered.stream().map(b -> {
            OfferSnapshot snap = snapshotMap.get(b.getId());
            return AdminBookingDto.builder()
                    .id(b.getId())
                    .bookingReference(b.getBookingReference())
                    .userId(b.getUserId())
                    .productType(b.getProductType().name())
                    .status(b.getStatus().name())
                    .amount(snap != null ? snap.getDisplayAmount() : null)
                    .currency(snap != null ? snap.getDisplayCurrency() : "EUR")
                    .provider(snap != null ? snap.getProvider() : null)
                    .providerOfferId(snap != null ? snap.getProviderOfferId() : null)
                    .createdAt(b.getCreatedAt())
                    .updatedAt(b.getUpdatedAt())
                    .statusChangedAt(b.getStatusChangedAt())
                    .expiresAt(b.getExpiresAt())
                    .pastDue(b.getStatus() == BookingStatus.PENDING_PAYMENT && b.isExpired(Instant.now()))
                    .selectedDetails(snap != null ? snap.getSelectedDetails() : null)
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(PagedResponse.of(dtos, safePage, safeSize));
    }

    @GetMapping("/payments")
    public ResponseEntity<PagedResponse<AdminPaymentDto>> getPayments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String provider,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String createdFrom,
            @RequestParam(required = false) String createdTo
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        List<Payment> payments = paymentRepository.findAll();

        Instant fromInstant = parseInstant(createdFrom);
        Instant toInstant = parseInstant(createdTo);
        String queryLower = (q != null && !q.isBlank()) ? q.trim().toLowerCase() : null;

        List<AdminPaymentDto> dtos = payments.stream()
                .filter(p -> status == null || status.isBlank() || "ALL".equalsIgnoreCase(status) || p.getStatus().name().equalsIgnoreCase(status))
                .filter(p -> provider == null || provider.isBlank() || "ALL".equalsIgnoreCase(provider) || (p.getProviderName() != null && p.getProviderName().equalsIgnoreCase(provider)))
                .filter(p -> fromInstant == null || (p.getCreatedAt() != null && !p.getCreatedAt().isBefore(fromInstant)))
                .filter(p -> toInstant == null || (p.getCreatedAt() != null && !p.getCreatedAt().isAfter(toInstant)))
                .filter(p -> {
                    if (queryLower == null) return true;
                    return (p.getPaymentReference() != null && p.getPaymentReference().toLowerCase().contains(queryLower)) ||
                           (p.getBookingId() != null && p.getBookingId().toString().toLowerCase().contains(queryLower)) ||
                           (p.getProviderTransactionId() != null && p.getProviderTransactionId().toLowerCase().contains(queryLower));
                })
                .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(p -> AdminPaymentDto.builder()
                        .id(p.getId())
                        .bookingId(p.getBookingId())
                        .paymentReference(p.getPaymentReference())
                        .providerName(p.getProviderName())
                        .providerOrderId(p.getProviderOrderId())
                        .providerTransactionId(p.getProviderTransactionId())
                        .amount(p.getAmount())
                        .currency(p.getCurrency())
                        .status(p.getStatus().name())
                        .paymentMethodType(p.getPaymentMethodType())
                        .errorMessage(p.getErrorMessage())
                        .createdAt(p.getCreatedAt())
                        .updatedAt(p.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(PagedResponse.of(dtos, safePage, safeSize));
    }

    @GetMapping("/refunds")
    public ResponseEntity<PagedResponse<AdminRefundDto>> getRefunds(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String q
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        List<RefundRecord> refunds = refundRecordRepository.findAll();
        String queryLower = (q != null && !q.isBlank()) ? q.trim().toLowerCase() : null;

        List<AdminRefundDto> dtos = refunds.stream()
                .filter(r -> {
                    if (queryLower == null) return true;
                    return (r.getRefundReference() != null && r.getRefundReference().toLowerCase().contains(queryLower)) ||
                           (r.getBookingId() != null && r.getBookingId().toString().toLowerCase().contains(queryLower)) ||
                           (r.getProviderRefundId() != null && r.getProviderRefundId().toLowerCase().contains(queryLower));
                })
                .sorted(Comparator.comparing(RefundRecord::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(r -> AdminRefundDto.builder()
                        .id(r.getId())
                        .paymentId(r.getPaymentId())
                        .bookingId(r.getBookingId())
                        .refundReference(r.getRefundReference())
                        .providerRefundId(r.getProviderRefundId())
                        .amount(r.getAmount())
                        .currency(r.getCurrency())
                        .reason(r.getReason())
                        .status(r.getStatus())
                        .requestedBy(r.getRequestedBy())
                        .createdAt(r.getCreatedAt())
                        .updatedAt(r.getUpdatedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(PagedResponse.of(dtos, safePage, safeSize));
    }

    @GetMapping("/cancellations")
    public ResponseEntity<PagedResponse<AdminCancellationDto>> getCancellations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String q
    ) {
        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        List<CancellationRequest> requests = cancellationRequestRepository.findAll();
        String queryLower = (q != null && !q.isBlank()) ? q.trim().toLowerCase() : null;

        List<AdminCancellationDto> dtos = requests.stream()
                .filter(c -> {
                    if (queryLower == null) return true;
                    return (c.getReason() != null && c.getReason().toLowerCase().contains(queryLower)) ||
                           (c.getBookingId() != null && c.getBookingId().toString().toLowerCase().contains(queryLower));
                })
                .sorted(Comparator.comparing(CancellationRequest::getRequestedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .map(c -> AdminCancellationDto.builder()
                        .id(c.getId())
                        .bookingId(c.getBookingId())
                        .requestedBy(c.getRequestedBy())
                        .reason(c.getReason())
                        .status(c.getStatus())
                        .policyType(c.getPolicyType())
                        .providerName(c.getProviderName())
                        .providerCancellationReference(c.getProviderCancellationReference())
                        .refundStatus(c.getRefundStatus())
                        .refundAmount(c.getRefundAmount())
                        .cancellationFee(c.getCancellationFee())
                        .currency(c.getCurrency())
                        .requestedAt(c.getRequestedAt())
                        .processedAt(c.getProcessedAt())
                        .refundedAt(c.getRefundedAt())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(PagedResponse.of(dtos, safePage, safeSize));
    }

    private static Instant parseInstant(String text) {
        if (text == null || text.isBlank()) return null;
        try {
            return Instant.parse(text);
        } catch (Exception e) {
            return null;
        }
    }

    @PostMapping("/cancellations/{id}/retry-refund")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<com.ahmed.reservationservice.domain.dto.CancellationStatusDto> retryRefund(
            @PathVariable UUID id,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.oauth2.jwt.Jwt jwt) {
        return ResponseEntity.ok(cancellationService.retryRefund(id, UUID.fromString(jwt.getSubject())));
    }
}
