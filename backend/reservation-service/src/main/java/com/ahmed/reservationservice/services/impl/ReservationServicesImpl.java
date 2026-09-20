package com.ahmed.reservationservice.services.impl;

import java.util.List;



import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.ahmed.reservationservice.DTO.ReservationsDTO;
import com.ahmed.reservationservice.DTO.ResponseDto;
import com.ahmed.reservationservice.DTO.UtilisateurDTO;
import com.ahmed.reservationservice.models.Reservations;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ReservationServices;

import jakarta.transaction.Transactional;

@Transactional
@Component 
@Service
public class ReservationServicesImpl implements ReservationServices{
 
	@Autowired
	private  ReservationRepository reservationRepo;
	@Autowired
	private RestTemplate restTemplate;
	

	

	@Override
	public ResponseDto getReservation(Long idr) {

	    ResponseDto responseDto = new ResponseDto();
	    

	    // Récupération de la réservation
	    Reservations reservation = reservationRepo.findById(idr).orElse(null);
	    
	    if (reservation == null) {
	        // Gérer le cas où la réservation n'est pas trouvée
	        responseDto.setMessage("La réservation avec l'ID " + idr + " n'existe pas.");
	        return responseDto;
	    }
	

	    // Conversion de la réservation en DTO
	    ReservationsDTO reservationDto = mapToReservation(reservation);

	    
	    ResponseEntity<UtilisateurDTO> responseEntity = restTemplate
                .getForEntity("http://localhost:8081/api/utilisateurs/id/" + reservation.getIdr(),
                		UtilisateurDTO.class);
	 
	        UtilisateurDTO utilisateurDto = responseEntity.getBody();
	        if (utilisateurDto != null) {
		    	  responseDto.setUtilisateur(utilisateurDto);
		    	}
	        System.out.println(responseEntity.getStatusCode());
	        // Configuration des DTO dans la réponse
	        responseDto.setReservation(reservationDto);
	        responseDto.setUtilisateur(utilisateurDto);
			return responseDto;
	}
	private ReservationsDTO mapToReservation(Reservations reservation){
		ReservationsDTO reservationDto = new ReservationsDTO();
		reservationDto.setIdr(reservation.getIdr());
		reservationDto.setDate(reservation.getDate());
		reservationDto.setActivitee(reservation.getActivitee());
		reservationDto.setTransport(reservation.getTransport());
		reservationDto.setHebergement(reservation.getHebergement());
		reservationDto.setPrixtot(reservation.getPrixtot());
		reservationDto.setNombrepersonne(reservation.getNombrepersonne());
		reservationDto.setTransport(reservation.getTransport());
        return reservationDto;
    }
	
	@Override
	public List<Reservations> getAllReservations() {
		// TODO Auto-generated method stub
		 return reservationRepo.findAll();
	}

	@Override
	public void deleteReservation(Long id) {
	
		 reservationRepo.deleteById(id);
	}

	@Override
	public Reservations updateReservation(Long id, Reservations reservationRequest) throws ResourceNotFoundException {
		// TODO Auto-generated method stub
		Reservations existingReservation = reservationRepo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Réservation non trouvée pour l'ID : " + id));
        existingReservation.setHebergement(reservationRequest.getHebergement());
        existingReservation.setTransport(reservationRequest.getTransport());
        existingReservation.setActivitee(reservationRequest.getActivitee());
        existingReservation.setDate(reservationRequest.getDate());
        existingReservation.setPrixtot(reservationRequest.getPrixtot());
        existingReservation.setNombrepersonne(reservationRequest.getNombrepersonne());
        existingReservation.setDuree(reservationRequest.getDuree());

        return reservationRepo.save(existingReservation);
	}

	@Override
    public Reservations createReservation(Reservations reservation) {
        // Here you can add any business logic before saving
        reservation.calculateTotalPrice();  // Assuming you have a method to calculate total price
        return reservationRepo.save(reservation);
    }

	@Override
	public Reservations getReservationById(Long id) throws ResourceNotFoundException {
		return reservationRepo.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Réservation non trouvée pour l'ID : " + id));
	}

	@Override
	public List<Reservations> getReservationsByUserId(Long idu) {
		return reservationRepo.findByIdu(idu);
	}


	
	
	

}
