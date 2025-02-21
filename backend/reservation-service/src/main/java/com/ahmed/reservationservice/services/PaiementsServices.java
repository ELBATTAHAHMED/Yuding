package com.ahmed.reservationservice.services;

import com.ahmed.reservationservice.models.Paiements;
import com.ahmed.reservationservice.models.ResourceNotFoundException;

import java.util.List;
public interface PaiementsServices {


	    List<Paiements> getAllPaiements();

	    Paiements getPaymentById(Long id) throws ResourceNotFoundException;

	    Paiements createPaiement(Paiements paiement);

	    void deletePaiement(Long id);

	    Paiements updatePaiement(Long id, Paiements paiementRequest) throws ResourceNotFoundException;
	}

