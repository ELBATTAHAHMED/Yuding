package com.ahmed.reservationservice.DTO;
import lombok.*;

import java.time.LocalDate;

@Setter
@Getter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurDTO {	
	private Long idu;
	private String nom_utilisateur;
	private String prenom_utilisateur;
	private String email_utilisateur;
	private	LocalDate date_naissance;
	private String pays;	
	private String genre;
	private String password;
	private String username;
	private String num_tele;

	
}
