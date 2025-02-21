package com.ahmed.reservationservice.controllers;

import com.ahmed.reservationservice.models.Paiements;
import com.ahmed.reservationservice.models.Reservations;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.services.PaiementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.impl.ReservationServicesImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/apir/paiements")
public class PaiementsController {

    private final PaiementsServices paiementsServices;

    @Autowired // Ajouter cette injection
    private ReservationServices reservationServices;

    @Autowired
    public PaiementsController(
            PaiementsServices paiementsServices,
            ReservationServices reservationServices // Ajouter ce paramètre
    ) {
        this.paiementsServices = paiementsServices;
        this.reservationServices = reservationServices; // Initialiser
    }

	@GetMapping("/all")
    public ResponseEntity<List<Paiements>> getAllPaiements() {
        List<Paiements> paiementsList = paiementsServices.getAllPaiements();
        return ResponseEntity.ok(paiementsList);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Paiements> getPaymentById(@PathVariable("id") Long id) {
        try {
            Paiements paiement = paiementsServices.getPaymentById(id);
            return ResponseEntity.ok(paiement);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/create")
    public ResponseEntity<Paiements> createPaiement(@RequestBody Paiements paiement) {
        try {
            // [1] Récupérer la réservation
            Reservations reservation = reservationServices.getReservationById(paiement.getIdr());

            // Vérifier que la réservation existe
            if (reservation == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(null);  // Répondre avec un code d'erreur si la réservation n'existe pas
            }

            // [2] Lier le montant
            paiement.setPrixtot(reservation.getPrixtot());

            // [3] Sauvegarder
            return ResponseEntity.ok(paiementsServices.createPaiement(paiement));

        } catch (ResourceNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        } catch (Exception e) {
            e.printStackTrace();  // Pour plus de détails sur l'erreur
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();  // Retourner une erreur générique si quelque chose ne va pas
        }
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Paiements> updatePaiement(@PathVariable("id") Long id, @RequestBody Paiements paiement) {
        try {
            Paiements updatedPaiement = paiementsServices.updatePaiement(id, paiement);
            return ResponseEntity.ok(updatedPaiement);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deletePaiement(@PathVariable("id") Long id) {
        paiementsServices.deletePaiement(id);
        return ResponseEntity.noContent().build();
    }
}