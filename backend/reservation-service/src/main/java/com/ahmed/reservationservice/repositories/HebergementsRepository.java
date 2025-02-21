package com.ahmed.reservationservice.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.stereotype.Repository;
import com.ahmed.reservationservice.models.Hebergements;
@Repository
public interface HebergementsRepository extends JpaRepository <Hebergements , Long>{


	List<Hebergements> findByPaysAndVille(String pays, String ville);
	
	}
