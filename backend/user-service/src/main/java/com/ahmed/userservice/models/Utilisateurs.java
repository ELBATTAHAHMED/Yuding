package com.ahmed.userservice.models;

import java.time.LocalDate;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
@Data
@Table(name = "utilisateurs")
public class Utilisateurs {
    @Id
    @GeneratedValue (strategy=GenerationType.IDENTITY)
    @Column(name = "idu", nullable=false)
    private Long idu;
    @Column(name = "nom_utilisateur" ,nullable=false)
    private String nom_utilisateur;
    @Column(name = "prenom_utilisateur" ,nullable=false)
    private String prenom_utilisateur;
    @Column(name = "email_utilisateur" , nullable=false)
    private String email_utilisateur;
    @Column(name = "date_naissance", nullable=false)
    private	LocalDate date_naissance;
    @Column(name = "pays" , nullable=false)
    private String pays;
    @Column(name = "genre" , nullable=false)
    private String genre;
    @Column(name = "password" , nullable=false)
    private String password;
    @Column(name = "username" , nullable=false)
    private String username;
    @Column(name = "num_tele" , nullable=false)
    private String num_tele;
}