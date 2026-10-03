package com.ahmed.reservationservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDto {
    private long totalReservations;
    private long totalPayments;
    private double totalRevenue;
    private long totalRefunds;
    private double totalRefundedAmount;
    private long totalCancellations;
    private Map<String, Long> bookingsByStatus;
    private Map<String, Long> bookingsByProduct;
    private Map<String, Long> paymentsByStatus;
    private Map<String, Long> paymentsByProvider;
}
