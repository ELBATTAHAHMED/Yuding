package com.ahmed.reservationservice.controllers;

import java.util.List;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.feigh.UtilisateursFeign;
import com.ahmed.reservationservice.models.*;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.ahmed.reservationservice.DTO.ResponseDto;
import com.ahmed.reservationservice.services.ReservationServices;

@RestController
@RequestMapping("/apir/reservations")
public class ReservationController {

	@Autowired
	private HebergementsServices hebergementsServices;
	@Autowired
	private TransportsServices transportsServices;
	@Autowired
	private ActiviteesServices activiteesServices;
	private final ReservationServices reservationServices;
	private final UtilisateurFeign utilisateurFeign;


	@Autowired
	public ReservationController(ReservationServices reservationServices, UtilisateurFeign utilisateurFeign) {
		this.reservationServices = reservationServices;
		this.utilisateurFeign = utilisateurFeign;
	}

	// Get all reservations
	@GetMapping("/all")
	public ResponseEntity<List<Reservations>> getAllReservations() {
		return ResponseEntity.ok(reservationServices.getAllReservations());
	}

	@GetMapping("/id/{id}")
	public ResponseEntity<Reservations> getReservationById(@PathVariable Long id) {
		try {
			return ResponseEntity.ok(reservationServices.getReservationById(id));
		} catch (ResourceNotFoundException e) {
			return ResponseEntity.notFound().build();
		}
	}
	@PostMapping("/create/{idu}")
	public ResponseEntity<Reservations> createReservation(
			@PathVariable Long idu,
			@RequestBody Reservations reservationRequest) {

		try {
			// [1] Vérifier l'utilisateur
			UtilisateursFeign utilisateur = utilisateurFeign.getUtilisateurById(idu);
			if (utilisateur == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

			// Gestion conditionnelle Hébergement
			if (reservationRequest.getHebergement() != null
					&& reservationRequest.getHebergement().getId_hebergement() != null) {

				Hebergements hebergement = hebergementsServices.getHebergementById(
						reservationRequest.getHebergement().getId_hebergement()
				);
				reservationRequest.setHebergement(hebergement);
			} else {
				reservationRequest.setHebergement(null); // Force null si non fourni
			}

			// Gestion conditionnelle Transport
			if (reservationRequest.getTransport() != null
					&& reservationRequest.getTransport().getIdt() != null) {

				Transports transport = transportsServices.getTransportById(
						reservationRequest.getTransport().getIdt()
				);
				reservationRequest.setTransport(transport);
			} else {
				reservationRequest.setTransport(null); // Force null si non fourni
			}

			// Gestion conditionnelle Activitee
			if (reservationRequest.getActivitee() != null
					&& reservationRequest.getActivitee().getIda() != null) {

				Activitees activitees = activiteesServices.getActivityById(
						reservationRequest.getActivitee().getIda()
				);
				reservationRequest.setActivitee(activitees);
			} else {
				reservationRequest.setActivitee(null); // Force null si non fourni
			}

			// [4] Calculer le prix
			reservationRequest.setIdu(idu);
			reservationRequest.calculateTotalPrice();

			// [5] Debug
			System.out.println("Réservation prête : " + reservationRequest);

			return ResponseEntity.ok(reservationServices.createReservation(reservationRequest));

		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.internalServerError().build();
		}
	}


	@PutMapping("/update/{id}")
	public ResponseEntity<Reservations> updateReservation(@PathVariable Long id, @RequestBody Reservations reservation)
			throws ResourceNotFoundException {
		return ResponseEntity.ok(reservationServices.updateReservation(id, reservation));
	}

	@DeleteMapping("/delete/{id}")
	public ResponseEntity<Void> deleteReservation(@PathVariable Long id) {
		reservationServices.deleteReservation(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}")
	public ResponseEntity<ResponseDto> getReservation(@PathVariable("id") Long idr) throws ResourceNotFoundException {
		ResponseDto responseDto = reservationServices.getReservation(idr);
		return ResponseEntity.ok(responseDto);
	}


}
