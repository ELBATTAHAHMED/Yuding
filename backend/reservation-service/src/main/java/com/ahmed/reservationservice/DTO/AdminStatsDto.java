package com.ahmed.reservationservice.DTO;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDto {
    private long totalReservations;
    private long totalPayments;
    private double totalRevenue;
    private long totalHebergements;
    private long totalTransports;
    private long totalActivites;
}
