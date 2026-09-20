package com.ahmed.reservationservice.controllers;

import com.ahmed.reservationservice.DTO.AdminStatsDto;
import com.ahmed.reservationservice.models.Paiements;
import com.ahmed.reservationservice.models.Reservations;
import com.ahmed.reservationservice.repositories.ActiviteesRepository;
import com.ahmed.reservationservice.repositories.HebergementsRepository;
import com.ahmed.reservationservice.repositories.PaiementsRepository;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.repositories.TransportsRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import org.springframework.security.access.prepost.PreAuthorize;

@RestController
@RequestMapping("/apir/admin")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
public class AdminDashboardController {

    private final ReservationRepository reservationRepository;
    private final PaiementsRepository paiementsRepository;
    private final HebergementsRepository hebergementsRepository;
    private final TransportsRepository transportsRepository;
    private final ActiviteesRepository activiteesRepository;

    public AdminDashboardController(
            ReservationRepository reservationRepository,
            PaiementsRepository paiementsRepository,
            HebergementsRepository hebergementsRepository,
            TransportsRepository transportsRepository,
            ActiviteesRepository activiteesRepository
    ) {
        this.reservationRepository = reservationRepository;
        this.paiementsRepository = paiementsRepository;
        this.hebergementsRepository = hebergementsRepository;
        this.transportsRepository = transportsRepository;
        this.activiteesRepository = activiteesRepository;
    }

    @GetMapping("/stats")
    public ResponseEntity<AdminStatsDto> getStats() {
        long totalReservations = reservationRepository.count();
        long totalPayments = paiementsRepository.count();
        double totalRevenue = paiementsRepository.findAll().stream()
                .map(Paiements::getPrixtot)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .sum();
        long totalHebergements = hebergementsRepository.count();
        long totalTransports = transportsRepository.count();
        long totalActivites = activiteesRepository.count();

        AdminStatsDto stats = new AdminStatsDto(
                totalReservations,
                totalPayments,
                totalRevenue,
                totalHebergements,
                totalTransports,
                totalActivites
        );

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/recent-reservations")
    public ResponseEntity<List<Reservations>> getRecentReservations(
            @RequestParam(defaultValue = "10") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        List<Reservations> reservations = reservationRepository.findAll();
        Comparator<Reservations> comparator = Comparator
                .comparing(Reservations::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(Reservations::getIdr, Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed();
        return ResponseEntity.ok(reservations.stream()
                .sorted(comparator)
                .limit(safeLimit)
                .collect(Collectors.toList()));
    }

    @GetMapping("/recent-payments")
    public ResponseEntity<List<Paiements>> getRecentPayments(
            @RequestParam(defaultValue = "10") int limit
    ) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        List<Paiements> paiements = paiementsRepository.findAll();
        Comparator<Paiements> comparator = Comparator
                .comparing(Paiements::getDate, Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(paiement -> paiement.getId_paiement(), Comparator.nullsLast(Comparator.naturalOrder()))
                .reversed();
        return ResponseEntity.ok(paiements.stream()
                .sorted(comparator)
                .limit(safeLimit)
                .collect(Collectors.toList()));
    }
}
