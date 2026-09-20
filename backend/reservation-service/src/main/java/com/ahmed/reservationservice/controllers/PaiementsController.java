package com.ahmed.reservationservice.controllers;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.models.Paiements;
import com.ahmed.reservationservice.models.Reservations;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.services.PaiementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/apir/paiements")
public class PaiementsController {

    private final PaiementsServices paiementsServices;
    private final ReservationServices reservationServices;

    @Autowired
    public PaiementsController(
            PaiementsServices paiementsServices,
            ReservationServices reservationServices
    ) {
        this.paiementsServices = paiementsServices;
        this.reservationServices = reservationServices;
    }

    // View all payments across the system (restricted to Admin & Support)
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    @GetMapping("/all")
    public ResponseEntity<List<Paiements>> getAllPaiements() {
        List<Paiements> paiementsList = paiementsServices.getAllPaiements();
        return ResponseEntity.ok(paiementsList);
    }

    // View a specific payment: owner of the related reservation or Admin/Support
    @GetMapping("/{id}")
    public ResponseEntity<Paiements> getPaymentById(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal Jwt jwt) throws ResourceNotFoundException {

        Paiements paiement = paiementsServices.getPaymentById(id);
        if (paiement == null) {
            return ResponseEntity.notFound().build();
        }

        // Check ownership via the reservation owner
        if (paiement.getIdr() != null) {
            try {
                Reservations reservation = reservationServices.getReservationById(paiement.getIdr());
                if (!SecurityUtils.isOwnerOrPrivileged(reservation.getIdu())) {
                    throw new AccessDeniedException("Access denied: You do not have permission to view this payment");
                }
            } catch (ResourceNotFoundException ignored) {
                // If reservation is missing and user is not admin, deny
                if (!SecurityUtils.hasRole("ADMIN") && !SecurityUtils.hasRole("SUPPORT")) {
                    throw new AccessDeniedException("Access denied: Reservation not found for payment");
                }
            }
        }

        return ResponseEntity.ok(paiement);
    }

    // Create payment: user must own the reservation (or be Admin)
    @PostMapping("/create")
    public ResponseEntity<Paiements> createPaiement(
            @RequestBody Paiements paiement,
            @AuthenticationPrincipal Jwt jwt) {
        try {
            if (paiement.getIdr() == null) {
                return ResponseEntity.badRequest().build();
            }

            Reservations reservation = reservationServices.getReservationById(paiement.getIdr());
            if (reservation == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);
            }

            // Verify the authenticated user owns this reservation (prevent paying for another user's reservation)
            if (!SecurityUtils.isOwnerOrPrivileged(reservation.getIdu())) {
                throw new AccessDeniedException("Access denied: You cannot create a payment for another user's reservation");
            }

            paiement.setPrixtot(reservation.getPrixtot());
            return ResponseEntity.ok(paiementsServices.createPaiement(paiement));

        } catch (AccessDeniedException e) {
            throw e;
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // Update payment: restricted to Admin
    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/update/{id}")
    public ResponseEntity<Paiements> updatePaiement(@PathVariable("id") Long id, @RequestBody Paiements paiement) {
        try {
            Paiements updatedPaiement = paiementsServices.updatePaiement(id, paiement);
            return ResponseEntity.ok(updatedPaiement);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    // Delete payment: restricted to Admin
    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deletePaiement(@PathVariable("id") Long id) {
        paiementsServices.deletePaiement(id);
        return ResponseEntity.noContent().build();
    }
}