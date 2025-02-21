package com.ahmed.reservationservice.feigh;

import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class UtilisateursFeign {

    private Long idu;
    private String nom_utilisateur;
    private String prenom_utilisateur;
    private String email_utilisateur;
    private LocalDate date_naissance;
    private String pays;
    private String genre;
    private String password;
    private String username;
    private String num_tele;
}
