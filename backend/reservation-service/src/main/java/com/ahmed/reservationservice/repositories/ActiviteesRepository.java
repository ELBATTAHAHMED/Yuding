package com.ahmed.reservationservice.repositories;
import java.util.Date;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;
import com.ahmed.reservationservice.models.Activitees;
@Repository
public interface ActiviteesRepository extends JpaRepository <Activitees , Long> {
	
    Optional<Activitees> findById(Long id);

	List<Activitees> findByPaysAndVille(String pays, String ville);
	List<Activitees> findByPaysAndVilleAndDate(String pays, String ville, Date date);
}
 

