package com.ahmed.reservationservice.services;
import com.ahmed.reservationservice.DTO.ResponseDto;
import com.ahmed.reservationservice.models.Reservations;
import com.ahmed.reservationservice.models.ResourceNotFoundException;

import java.util.List;
public interface ReservationServices {


	    List<Reservations> getAllReservations();
    
	    Reservations createReservation(Reservations reservation);

	    void deleteReservation(Long idr);

	    Reservations updateReservation(Long idr, Reservations reservationRequest) throws ResourceNotFoundException;


		
		ResponseDto getReservation(Long idr) throws ResourceNotFoundException;
		Reservations getReservationById(Long id) throws ResourceNotFoundException;
		List<Reservations> getReservationsByUserId(Long idu);
	}

