package com.ahmed.reservationservice.services.impl;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ahmed.reservationservice.models.Hebergements;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.repositories.HebergementsRepository;
import com.ahmed.reservationservice.services.HebergementsServices;
@Service
public class HebergementsServicesImpl implements HebergementsServices {

	@Autowired
	 private HebergementsRepository hebergementRepo;
	
	
	@Override
	public List<Hebergements> getAllHebergements() {
		// TODO Auto-generated method stub
		return hebergementRepo.findAll();
	}

	@Override
	public Hebergements getHebergementById(Long id) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		 return hebergementRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hébergement introuvable pour l'ID : " + id));
	}

	
	/*public Hebergements createHebergement(Hebergements hebergement) throws Exception {

        // 1. Validation (Optional, can be moved here for service-side validation)
        if (hebergement.getAdresseHebergement() == null || hebergement.getAdresseHebergement().isEmpty()) {
            throw new Exception("Missing required field: adresseHebergement"); // Consider a more specific exception type
        }

        // 2. Save Hebergements
        Hebergements savedHebergement = hebergementRepo.save(hebergement);

        return savedHebergement;
    }*/
	
	@Override
	  public Hebergements createHebergement(Hebergements hebergement) {
	    return hebergementRepo.save(hebergement);
	  }

	@Override
	public void deleteHebergement(Long id) {
		// TODO Auto-generated method stub
		 hebergementRepo.deleteById(id);
		
	}

	@Override
	public Hebergements updateHebergement(Long id, Hebergements hebergementRequest) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		Hebergements existingHebergement = hebergementRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Hébergement introuvable pour l'ID : " + id));
        existingHebergement.setNom_hebergement(hebergementRequest.getNom_hebergement());
        existingHebergement.setType_hebergement(hebergementRequest.getType_hebergement());
        existingHebergement.setAdresseHebergement(hebergementRequest.getAdresseHebergement());
        existingHebergement.setDesc_hebergement(hebergementRequest.getDesc_hebergement());
        existingHebergement.setPrix_hebergement(hebergementRequest.getPrix_hebergement());
        existingHebergement.setCapacite_hebergement(hebergementRequest.getCapacite_hebergement());
        existingHebergement.setVille(hebergementRequest.getVille());
        existingHebergement.setPays(hebergementRequest.getPays());
        existingHebergement.setTele_fournisseur(hebergementRequest.getTele_fournisseur());
        existingHebergement.setNom_fournisseur(hebergementRequest.getNom_fournisseur());
        existingHebergement.setPhoto_hebergament(hebergementRequest.getPhoto_hebergament());
        return hebergementRepo.save(existingHebergement);
	}

	public List<Hebergements> findHebergementsByPaysVille(String pays, String ville) {
        return hebergementRepo.findByPaysAndVille(pays, ville);
    }

}
