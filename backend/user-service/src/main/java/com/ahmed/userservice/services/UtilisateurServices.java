package com.ahmed.userservice.services;
import com.ahmed.userservice.models.Utilisateurs;

import org.springframework.data.crossstore.ChangeSetPersister.NotFoundException;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Optional;

public interface UtilisateurServices {
	
    ResponseEntity<Utilisateurs> getUserId(Long id);

    ResponseEntity<List<Utilisateurs>> getAllUtilisateurs();

    //ResponseEntity<Utilisateurs> getUserById(Long id);

    ResponseEntity<Utilisateurs> updateUtilisateur(Long id, Utilisateurs utilisateur);

    ResponseEntity<Void> deleteUtilisateur(Long id);
 
    Optional<Utilisateurs> findUtilisateurByUsernameAndPassword(String username, String password);

    Utilisateurs createUtilisateur(Utilisateurs utilisateur);
    
    Utilisateurs getUserById(Long id);
    
    Optional<Utilisateurs> rechercherParUsername(String username) throws NotFoundException;


}