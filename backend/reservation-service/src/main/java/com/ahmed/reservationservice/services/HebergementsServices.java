package com.ahmed.reservationservice.services;
import com.ahmed.reservationservice.models.Hebergements;
import com.ahmed.reservationservice.models.ResourceNotFoundException;

import java.util.List;
public interface HebergementsServices {



	    List<Hebergements> getAllHebergements();

	    Hebergements getHebergementById(Long id) throws ResourceNotFoundException;


	    Hebergements createHebergement(Hebergements hebergement);

	    void deleteHebergement(Long id);

	    Hebergements updateHebergement(Long id, Hebergements hebergementRequest) throws ResourceNotFoundException;


		List<Hebergements> findHebergementsByPaysVille(String pays, String ville);
	}

