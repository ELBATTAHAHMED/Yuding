package com.ahmed.reservationservice.DTO;
import java.sql.Date;
import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.Hebergements;
import com.ahmed.reservationservice.models.Transports;

import jakarta.persistence.Column;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.*;

@Getter
@Setter
@ToString
@NoArgsConstructor
@AllArgsConstructor
public class ReservationsDTO {
	private Long idr;

	private Date date;  
    
	private Long duree;  
	
    private Activitees activitee; 
    
    private Transports transport;

    private Hebergements hebergement;
    
    private Double prixtot;

    private Double nombrepersonne;
    
    private String idu;
    

	
}
