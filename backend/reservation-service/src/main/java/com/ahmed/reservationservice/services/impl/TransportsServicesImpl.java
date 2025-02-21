package com.ahmed.reservationservice.services.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.models.Transports;
import com.ahmed.reservationservice.repositories.TransportsRepository;
import com.ahmed.reservationservice.services.TransportsServices;

@Service
public class TransportsServicesImpl implements TransportsServices{

	 @Autowired
	private  TransportsRepository transportRepository;
	
	@Override
	public List<Transports> getAllTransports() {
		// TODO Auto-generated method stub
        return transportRepository.findAll();
	}

	@Override
	public Transports getTransportById(Long id) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		return transportRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transport introuvable pour l'ID : " + id));
	}

	@Override
	public Transports createTransport(Transports transport) {
		// TODO Auto-generated method stub
		return transportRepository.save(transport);
	}

	@Override
	public void deleteTransport(Long id) {
		// TODO Auto-generated method stub
		transportRepository.deleteById(id);
	}

	@Override
	public Transports updateTransport(Long id, Transports transportRequest) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		 Transports existingTransport = transportRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Transport introuvable pour l'ID : " + id));
	        existingTransport.setType_transport(transportRequest.getType_transport());
	        existingTransport.setDesc_transport(transportRequest.getDesc_transport());
	        existingTransport.setCompagnie(transportRequest.getCompagnie());
	        existingTransport.setLieudepp(transportRequest.getLieudepp());
	        existingTransport.setLieuarr(transportRequest.getLieuarr());
	        existingTransport.setAdresse(transportRequest.getAdresse());
	        existingTransport.setMarque(transportRequest.getMarque());
	        existingTransport.setPrix_transport(transportRequest.getPrix_transport());
	        existingTransport.setTele_fournisseur(transportRequest.getTele_fournisseur());
	        existingTransport.setNom_fournisseur(transportRequest.getNom_fournisseur());
	        existingTransport.setPays(transportRequest.getPays());
	        existingTransport.setVille(transportRequest.getVille());
	        existingTransport.setPhoto(transportRequest.getPhoto());
	        existingTransport.setPaysarr(transportRequest.getPaysarr());
	        existingTransport.setVillearr(transportRequest.getVillearr());
	        

	        return transportRepository.save(existingTransport);
	}
	

	@Override
    public List<Transports> searchTransportsByVille(String ville) {
        return transportRepository.findByVille(ville);
    }
	
	 @Override
	    public List<Transports> findTransportByCriteria(String pays, String lieudepp, String lieuarr) {
	        return transportRepository.findByPaysAndLieudeppAndLieuarr(pays, lieudepp, lieuarr);
	    }

	 
	 @Override
	    public List<Transports> searchTransports(String pays, String ville, String villearr, String paysarr) {
	        return transportRepository.findByPaysAndVilleAndVillearrAndPaysarr(pays, ville, villearr, paysarr);
	    }
	 
	 @Override
	    public List<Transports> searchTransportsByPaysAndVille(String pays, String ville) {
	        return transportRepository.findByPaysAndVille(pays, ville);
	    }
	 
	 @Override
	    public List<Transports> searchTransportsByPaysVilleLieuarr(String pays, String ville, String lieuarr) {
	        return transportRepository.findByPaysAndVilleAndLieuarr(pays, ville, lieuarr);
	    }
}


