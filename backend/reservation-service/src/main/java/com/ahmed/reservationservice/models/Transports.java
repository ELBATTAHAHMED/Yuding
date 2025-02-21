package com.ahmed.reservationservice.models;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Getter
@Setter
@ToString
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "TRANSPORTS")
public class Transports {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "idt", nullable=false)
	private Long idt;
	@Column(name = "type_transport")
	private String type_transport;
	@Column(name = "desc_transport", length = 1000)
	private String desc_transport;
	@Column(name = "compagnie")
	private String compagnie;
	@Column(name = "lieudepp")
	private String lieudepp;
	@Column(name = "lieuarr")
	private String lieuarr;
	@Column(name = "adresse")
	private String adresse;
	@Column(name = "marque")
	private String marque;
	@Column(name = "prix_transport" )
	private float prix_transport;
	@Column(name = "nom_fournisseur")
	private String nom_fournisseur;
	@Column(name = "tele_fournisseu" )
	private String tele_fournisseur;
	@Column(name = "pays")
	private String pays;
	@Column(name = "ville")
	private String ville;
	@Column(name = "paysarr")
	private String paysarr;
	@Column(name = "villearr")
	private String villearr;
	@Column(name = "photo")
	private List<String> photo; // List of URLs

				
}

