package com.ahmed.reservationservice.DTO;

import lombok.*;

@Setter
@Getter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ResponseDto {
	private ReservationsDTO Reservations;
    private UtilisateurDTO Utiliateurs;

	public void setReservation(ReservationsDTO reservationsDTo) {
	}
	public void setUtilisateur(UtilisateurDTO utilisateurDto) {
	}
	public void setMessage(String string) {
	}



}
