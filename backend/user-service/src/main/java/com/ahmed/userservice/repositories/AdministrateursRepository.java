package com.ahmed.userservice.repositories;
import java.util.Optional;

import com.ahmed.userservice.models.Administrateurs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;



@Repository
public interface AdministrateursRepository extends JpaRepository<Administrateurs, Long> {

    // Méthode pour l'authentification (email + mot de passe)
    Optional<Administrateurs> findByEmailAndPassword(String email, String password);
}