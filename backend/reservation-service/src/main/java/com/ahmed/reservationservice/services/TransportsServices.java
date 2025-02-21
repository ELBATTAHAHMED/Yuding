package com.ahmed.reservationservice.services;
import com.ahmed.reservationservice.models.Transports;

import com.ahmed.reservationservice.models.ResourceNotFoundException;

import java.util.List;
public interface TransportsServices {


	    List<Transports> getAllTransports();

	    Transports getTransportById(Long id) throws ResourceNotFoundException;

	    Transports createTransport(Transports transport);

	    void deleteTransport(Long id);

	    Transports updateTransport(Long id, Transports transportRequest) throws ResourceNotFoundException;

	    List<Transports> searchTransportsByVille(String ville);

	    List<Transports> findTransportByCriteria(String pays, String lieudepp, String lieuarr);
	    
	    List<Transports> searchTransports(String pays, String ville, String villearr, String paysarr);
	    
	    List<Transports> searchTransportsByPaysAndVille(String pays, String ville);
	    
	    List<Transports> searchTransportsByPaysVilleLieuarr(String pays, String ville, String lieuarr);
}
