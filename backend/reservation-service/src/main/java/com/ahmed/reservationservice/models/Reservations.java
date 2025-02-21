package com.ahmed.reservationservice.models;

import java.sql.Date;
import jakarta.persistence.*;

import lombok.*;

@Entity
@Getter
@Setter
@ToString
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "RESERVATIONS")
public class Reservations {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "idr", nullable = false)
	private Long idr;

	@Column(name = "date")
	private Date date;

	@Column(name = "duree")
	private Long duree;

	@ManyToOne
	@JoinColumn(name = "ida", referencedColumnName = "ida") // Foreign key referencing Activitees.id_activitee
	private Activitees activitee;

	@ManyToOne
	@JoinColumn(name = "idt", referencedColumnName = "idt") // Foreign key referencing Transports.id_transport
	private Transports transport;

	@ManyToOne
	@JoinColumn(name = "id_hebergement", referencedColumnName = "id_hebergement") // Foreign key referencing Hebergements.id_hebergement
	private Hebergements hebergement;

	@Column(name = "prixtot")
	private Double prixtot;

	@Column(name = "nombrepersonne")
	private Double nombrepersonne;

	@Column(name = "idu")
	private Long idu;

	public Double calculateTotalPrice() {
		if (prixtot != null) return prixtot;

		double totalPrice = 0.0;

		// Calcul spécifique aux hébergements
		if (hebergement != null) {
			totalPrice += hebergement.getPrix_hebergement() * duree * nombrepersonne;
		}

		// Calculs pour transport/activités (gardés pour compatibilité)
		if (transport != null) {
			totalPrice += transport.getPrix_transport() * nombrepersonne;
		}
		if (activitee != null) {
			totalPrice += activitee.getPrix_activitee() * duree;
		}

		this.prixtot = totalPrice;
		return totalPrice;
	}
	public void associateTransport(Transports transport) {
		this.transport = transport;
		calculateTotalPrice(); // Recalculer le prix
	}
}
