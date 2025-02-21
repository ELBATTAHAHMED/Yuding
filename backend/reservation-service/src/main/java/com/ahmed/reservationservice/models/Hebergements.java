package com.ahmed.reservationservice.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;


import java.util.List;

@Entity
@Getter
@Setter
@ToString
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "HEBERGEMENTS")
public class Hebergements {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "id_hebergement",nullable=false)
	private Long id_hebergement;
	@Column(name = "nom_hebergement")
	private String nom_hebergement;
	@Column(name = "type_hebergement" )
	private String type_hebergement;
	@Column(name = "adresseHebergement" )
	private String adresseHebergement;
	@Column(name = "desc_hebergement" , length = 1000)
	private String desc_hebergement;
	@Column(name = "prix_hebergement" )
	private float prix_hebergement;
	@Column(name = "capacite_hebergement")
	private int capacite_hebergement;
	@Column(name = "nom_fournisseur" )
	private String nom_fournisseur;
	@Column(name = "tele_fournisseur" )
	private Long tele_fournisseur;
	@Column(name = "ville" )
	private String ville;
	@Column(name = "pays" )
	private String pays;
	@Column(name = "photo_hebergament" )
	private List<String> photo_hebergament;
					

	
						
	}
