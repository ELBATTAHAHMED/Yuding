package com.ahmed.reservationservice.controllers;

import com.ahmed.reservationservice.DTO.*;
import com.ahmed.reservationservice.domain.model.Booking;
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
    public ResponseEntity<List<AdminBookingDto>> getBookings(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String productType
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<Booking> bookings = bookingRepository.findAll();

        // Sort descending by created_at
        List<Booking> filtered = bookings.stream()
                .filter(b -> status == null || status.isBlank() || b.getStatus().name().equalsIgnoreCase(status))
                .filter(b -> productType == null || productType.isBlank() || b.getProductType().name().equalsIgnoreCase(productType))
                .sorted(Comparator.comparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(safeLimit)
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
                    .build();
        }).collect(Collectors.toList());

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/payments")
    public ResponseEntity<List<AdminPaymentDto>> getPayments(
            @RequestParam(defaultValue = "50") int limit,
            @RequestParam(required = false) String status
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<Payment> payments = paymentRepository.findAll();

        List<AdminPaymentDto> dtos = payments.stream()
                .filter(p -> status == null || status.isBlank() || p.getStatus().name().equalsIgnoreCase(status))
                .sorted(Comparator.comparing(Payment::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(safeLimit)
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

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/refunds")
    public ResponseEntity<List<AdminRefundDto>> getRefunds(
            @RequestParam(defaultValue = "50") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<RefundRecord> refunds = refundRecordRepository.findAll();

        List<AdminRefundDto> dtos = refunds.stream()
                .sorted(Comparator.comparing(RefundRecord::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(safeLimit)
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

        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/cancellations")
    public ResponseEntity<List<AdminCancellationDto>> getCancellations(
            @RequestParam(defaultValue = "50") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 100));
        List<CancellationRequest> requests = cancellationRequestRepository.findAll();

        List<AdminCancellationDto> dtos = requests.stream()
                .sorted(Comparator.comparing(CancellationRequest::getRequestedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed())
                .limit(safeLimit)
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

        return ResponseEntity.ok(dtos);
    }
}
