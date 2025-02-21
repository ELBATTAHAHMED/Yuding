package com.ahmed.reservationservice.models;
import java.sql.Date;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.*;

@Entity
@Getter
@Setter
@ToString
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "PAIEMENTS")
public class Paiements {

		@Id
		@GeneratedValue (strategy=GenerationType.IDENTITY)
		@Column(name = "id_paiement" ,nullable=false)
		private Long id_paiement;
		@Column(name = "idr")
		private Long idr;
		@Column(name = "prixtot")
		private Double prixtot;
		@Column(name="modepaiement")
		private String modepaiement; // e.g., "credit card", "PayPal"
		@Column(name= " numcarte")
		private String numcarte; // e.g., "pending", "completed", "failed"
		@Column(name="date")
		private Date date;
		@Column(name="cvv")
		private Long cvv;


	}

