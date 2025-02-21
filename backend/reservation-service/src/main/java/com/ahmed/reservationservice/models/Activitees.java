package com.ahmed.reservationservice.models;

import java.sql.Date;
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
@Table(name = "activitees")
public class Activitees {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "ida", nullable=false)
	private Long ida;
	@Column(name = "prix_activitee" )
	private Double prix_activitee;
	@Column(name = "ville" )
	private String ville;
	@Column(name = "desc_activitee" , length = 1000)
	private String desc_activitee;
	@Column(name = "duree" )
	private String duree;
	@Column(name = "nom_fournisseur" )
	private String nom_fournisseur;
	@Column(name = "pays" )
	private String pays;
	@Column(name = "date" )
	private Date date;
	@Column(name = "tele_fournisseur" )
	private String tele_fournisseur;
	@Column(name = "photo" )
	private String photo;

}

