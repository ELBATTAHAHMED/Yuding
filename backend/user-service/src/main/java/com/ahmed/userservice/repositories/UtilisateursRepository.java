package com.ahmed.userservice.repositories;

import com.ahmed.userservice.models.Utilisateurs;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UtilisateursRepository extends JpaRepository<Utilisateurs, Long> {

    // Authentification par username + password
    Optional<Utilisateurs> findByUsernameAndPassword(String username, String password);

    // Trouver un utilisateur par username (retourne Optional pour éviter NullPointerException)
    Optional<Utilisateurs> findByUsername(String username); // Modification recommandée
}