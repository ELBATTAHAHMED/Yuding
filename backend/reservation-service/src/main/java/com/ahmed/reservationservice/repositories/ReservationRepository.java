package com.ahmed.reservationservice.repositories;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.ahmed.reservationservice.models.Reservations;

@Repository
public interface ReservationRepository extends JpaRepository <Reservations , Long>{


}
