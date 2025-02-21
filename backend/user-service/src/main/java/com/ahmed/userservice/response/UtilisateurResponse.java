package com.ahmed.userservice.response;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateurResponse {

	private Long id_utilisateur;

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
