package com.ahmed.reservationservice.services.impl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ahmed.reservationservice.models.Paiements;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.repositories.PaiementsRepository;
import com.ahmed.reservationservice.services.PaiementsServices;
@Service
public class PaiementsServicesImpl implements PaiementsServices{
	@Autowired
	private final PaiementsRepository paiementsRepo;

    PaiementsServicesImpl(PaiementsRepository paiementsRepo) {
        this.paiementsRepo = paiementsRepo;
    }

	@Override
	public List<Paiements> getAllPaiements() {
		// TODO Auto-generated method stub
		return paiementsRepo.findAll();
	}

	@Override
	public Paiements getPaymentById(Long id) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		return paiementsRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Paiements introuvable pour l'ID : " + id));
	}

	@Override
	public Paiements createPaiement(Paiements paiement) {
		// TODO Auto-generated method stub
		return paiementsRepo.save(paiement);
	}

	@Override
	public void deletePaiement(Long id) {
		// TODO Auto-generated method stub
		paiementsRepo.deleteById(id);
	}

	@Override
	public Paiements updatePaiement(Long id, Paiements paiementRequest) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		Paiements existingPaiement = paiementsRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Paiement introuvable pour l'ID : " + id));
        existingPaiement.setPrixtot(paiementRequest.getPrixtot());
        existingPaiement.setModepaiement(paiementRequest.getModepaiement());
        existingPaiement.setNumcarte(paiementRequest.getNumcarte());
        existingPaiement.setDate(paiementRequest.getDate());
        existingPaiement.setCvv(paiementRequest.getCvv());
        existingPaiement.setIdr(paiementRequest.getIdr());


        return paiementsRepo.save(existingPaiement);
	}

}
