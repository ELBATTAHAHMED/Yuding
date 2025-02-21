package com.ahmed.userservice.models;

import java.sql.Date;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.*;

@Entity
@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class Administrateurs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id_admin;
    private String nom;
    private String prenom;
    private String email;
    private Date naissance;
    private String pays;
    private String genre;
    private String password;
    private Long tele;
}