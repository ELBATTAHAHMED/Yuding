package com.ahmed.reservationservice.repositories;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.ahmed.reservationservice.models.Paiements;

@Repository
public interface PaiementsRepository extends JpaRepository <Paiements , Long>{

}
