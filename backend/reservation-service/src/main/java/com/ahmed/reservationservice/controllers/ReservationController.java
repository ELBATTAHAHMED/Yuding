package com.ahmed.reservationservice.controllers;

import java.util.List;
import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.models.*;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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

	// Get all reservations (restricted to Admin & Support)
	@PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
	@GetMapping("/all")
	public ResponseEntity<List<Reservations>> getAllReservations() {
		return ResponseEntity.ok(reservationServices.getAllReservations());
	}

	// Get reservations for the currently authenticated user (/me pattern prevents IDOR)
	@GetMapping("/me")
	public ResponseEntity<List<Reservations>> getMyReservations(@AuthenticationPrincipal Jwt jwt) {
		if (jwt == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		Long userId = Long.parseLong(jwt.getSubject());
		return ResponseEntity.ok(reservationServices.getReservationsByUserId(userId));
	}

	@GetMapping("/id/{id}")
	public ResponseEntity<Reservations> getReservationById(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
		try {
			Reservations res = reservationServices.getReservationById(id);
			if (!SecurityUtils.isOwnerOrPrivileged(res.getIdu())) {
				throw new AccessDeniedException("Access denied: You do not have permission to view this reservation");
			}
			return ResponseEntity.ok(res);
		} catch (ResourceNotFoundException e) {
			return ResponseEntity.notFound().build();
		}
	}

	// Create reservation from authenticated token subject
	@PostMapping("/create")
	public ResponseEntity<Reservations> createReservation(
			@RequestBody Reservations reservationRequest,
			@AuthenticationPrincipal Jwt jwt) {
		if (jwt == null) {
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
		}
		Long userId = Long.parseLong(jwt.getSubject());
		return doCreateReservation(userId, reservationRequest);
	}

	// Legacy route with user ID parameter; IDOR eliminated by overriding non-admin requests with JWT identity
	@PostMapping("/create/{idu}")
	public ResponseEntity<Reservations> createReservationLegacy(
			@PathVariable Long idu,
			@RequestBody Reservations reservationRequest,
			@AuthenticationPrincipal Jwt jwt) {

		Long effectiveUserId;
		if (jwt != null) {
			Long jwtUserId = Long.parseLong(jwt.getSubject());
			if (SecurityUtils.hasRole("ADMIN")) {
				effectiveUserId = idu;
			} else {
				effectiveUserId = jwtUserId;
			}
		} else {
			effectiveUserId = idu;
		}

		return doCreateReservation(effectiveUserId, reservationRequest);
	}

	private ResponseEntity<Reservations> doCreateReservation(Long userId, Reservations reservationRequest) {
		try {
			// Gestion conditionnelle Hébergement
			if (reservationRequest.getHebergement() != null
					&& reservationRequest.getHebergement().getId_hebergement() != null) {

				Hebergements hebergement = hebergementsServices.getHebergementById(
						reservationRequest.getHebergement().getId_hebergement()
				);
				reservationRequest.setHebergement(hebergement);
			} else {
				reservationRequest.setHebergement(null);
			}

			// Gestion conditionnelle Transport
			if (reservationRequest.getTransport() != null
					&& reservationRequest.getTransport().getIdt() != null) {

				Transports transport = transportsServices.getTransportById(
						reservationRequest.getTransport().getIdt()
				);
				reservationRequest.setTransport(transport);
			} else {
				reservationRequest.setTransport(null);
			}

			// Gestion conditionnelle Activitee
			if (reservationRequest.getActivitee() != null
					&& reservationRequest.getActivitee().getIda() != null) {

				Activitees activitees = activiteesServices.getActivityById(
						reservationRequest.getActivitee().getIda()
				);
				reservationRequest.setActivitee(activitees);
			} else {
				reservationRequest.setActivitee(null);
			}

			reservationRequest.setIdu(userId);
			reservationRequest.calculateTotalPrice();

			return ResponseEntity.ok(reservationServices.createReservation(reservationRequest));
		} catch (Exception e) {
			return ResponseEntity.internalServerError().build();
		}
	}

	@PutMapping("/update/{id}")
	public ResponseEntity<Reservations> updateReservation(
			@PathVariable Long id,
			@RequestBody Reservations reservation,
			@AuthenticationPrincipal Jwt jwt) throws ResourceNotFoundException {

		Reservations existing = reservationServices.getReservationById(id);
		if (!SecurityUtils.isOwnerOrPrivileged(existing.getIdu())) {
			throw new AccessDeniedException("Access denied: You do not have permission to modify this reservation");
		}
		// Prevent IDOR: keep original owner id
		reservation.setIdu(existing.getIdu());
		return ResponseEntity.ok(reservationServices.updateReservation(id, reservation));
	}

	@DeleteMapping("/delete/{id}")
	public ResponseEntity<Void> deleteReservation(
			@PathVariable Long id,
			@AuthenticationPrincipal Jwt jwt) throws ResourceNotFoundException {

		Reservations existing = reservationServices.getReservationById(id);
		if (!SecurityUtils.isOwnerOrPrivileged(existing.getIdu())) {
			throw new AccessDeniedException("Access denied: You do not have permission to delete this reservation");
		}
		reservationServices.deleteReservation(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}")
	public ResponseEntity<ResponseDto> getReservation(
			@PathVariable("id") Long idr,
			@AuthenticationPrincipal Jwt jwt) throws ResourceNotFoundException {

		Reservations existing = reservationServices.getReservationById(idr);
		if (!SecurityUtils.isOwnerOrPrivileged(existing.getIdu())) {
			throw new AccessDeniedException("Access denied: You do not have permission to view this reservation");
		}
		ResponseDto responseDto = reservationServices.getReservation(idr);
		return ResponseEntity.ok(responseDto);
	}
}
