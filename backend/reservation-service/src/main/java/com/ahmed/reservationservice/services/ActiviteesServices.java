package com.ahmed.reservationservice.services;
import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.models.Transports;

import java.io.IOException;
import java.util.Date;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;
public interface ActiviteesServices {


	    List<Activitees> getAllActivities();

	    Activitees getActivityById(Long id) throws ResourceNotFoundException;

	     Activitees createActivite(Activitees activitees);


	     void deleteActivite(Long id);

	    
	    List<Activitees> searchActivitesByPaysAndVille(String pays, String ville);
	    
	    List<Activitees> findByPaysAndVilleAndDate(String pays, String ville, Date date);
	    

	}
