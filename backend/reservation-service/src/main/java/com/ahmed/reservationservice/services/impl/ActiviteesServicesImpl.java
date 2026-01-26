package com.ahmed.reservationservice.services.impl;

import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.multipart.MultipartFile;

import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.repositories.ActiviteesRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
@Service
public class ActiviteesServicesImpl implements ActiviteesServices{

	@Autowired
	private  ActiviteesRepository activityRepo;

	
	@Override
	public List<Activitees> getAllActivities() {
		// TODO Auto-generated method stub
		return activityRepo.findAll();
	}

	@Override
	public Activitees getActivityById(Long id) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		return activityRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Activité introuvable pour l'ID : " + id));
	}


	@Override
    public Activitees createActivite(Activitees activitees) {
        return activityRepo.save(activitees);
    }

	@Override
	public Activitees updateActivite(Long id, Activitees activitees) throws ResourceNotFoundException {
		Activitees existingActivite = activityRepo.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Activité introuvable pour l'ID : " + id));
		existingActivite.setNom_activitee(activitees.getNom_activitee());
		existingActivite.setPrix_activitee(activitees.getPrix_activitee());
		existingActivite.setVille(activitees.getVille());
		existingActivite.setDesc_activitee(activitees.getDesc_activitee());
		existingActivite.setDuree(activitees.getDuree());
		existingActivite.setNom_fournisseur(activitees.getNom_fournisseur());
		existingActivite.setPays(activitees.getPays());
		existingActivite.setDate(activitees.getDate());
		existingActivite.setTele_fournisseur(activitees.getTele_fournisseur());
		existingActivite.setPhoto(activitees.getPhoto());
		return activityRepo.save(existingActivite);
	}


	


	
	@Override
    public List<Activitees> searchActivitesByPaysAndVille(String pays, String ville) {
        return activityRepo.findByPaysAndVille(pays, ville);
    }
	
	@Override
    public List<Activitees> findByPaysAndVilleAndDate(String pays, String ville, Date date) {
        return activityRepo.findByPaysAndVilleAndDate(pays, ville, date);
    }

	
	 

	   
	    @Override
	    public void deleteActivite(Long id) {
	    	activityRepo.deleteById(id);
	    }

}
