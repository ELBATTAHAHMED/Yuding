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

	/* @Override
	    public Activitees updateActivite(Activitees activitees) {
	        // Check if activity exists before update
	        Optional<Activitees> existingActivite = activiteesRepository.findById(activitees.getId_activitee());
	        if (existingActivite.isPresent()) {
	            return activiteesRepository.save(activitees);
	        } else {
	            // Throw an exception or handle the case where activity doesn't exist
	            throw new RuntimeException("Activite with ID " + activitees.getId_activitee() + " not found");
	        }
	    }

	    @Override
	    public void deleteActivite(Long id) {
	        activiteesRepository.deleteById(id);
	    }*/

	


	
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
