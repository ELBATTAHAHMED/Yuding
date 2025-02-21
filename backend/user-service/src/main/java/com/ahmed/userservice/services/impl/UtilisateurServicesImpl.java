package com.ahmed.userservice.services.impl;

import com.ahmed.userservice.models.Utilisateurs;
import com.ahmed.userservice.repositories.UtilisateursRepository;
import com.ahmed.userservice.services.UtilisateurServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.crossstore.ChangeSetPersister.NotFoundException;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class UtilisateurServicesImpl implements UtilisateurServices {

    private final UtilisateursRepository userRepository;

    @Autowired
    public UtilisateurServicesImpl(UtilisateursRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public ResponseEntity<List<Utilisateurs>> getAllUtilisateurs() {
        List<Utilisateurs> utilisateurs = userRepository.findAll();
        return ResponseEntity.ok(utilisateurs);
    }

    /*@Override
    public ResponseEntity<Utilisateurs> getUserById(Long id) {
        Utilisateurs utilisateur = userRepository.findById(id).orElse(null);
        if (utilisateur != null) {
            return ResponseEntity.ok(utilisateur);
        } else {
            return ResponseEntity.notFound().build();
        }
    }*/
    
    
    @Override
    public Utilisateurs getUserById(Long id) {
        return userRepository.findById(id).orElse(null);
    }
    
    @Override
    public Utilisateurs createUtilisateur(Utilisateurs utilisateur) {
        return userRepository.save(utilisateur);
    }

    @Override
    public ResponseEntity<Utilisateurs> updateUtilisateur(Long id, Utilisateurs utilisateur) {
        Utilisateurs existingUser = userRepository.findById(id).orElse(null);
        if (existingUser != null) {
            existingUser.setNom_utilisateur(utilisateur.getNom_utilisateur());
            existingUser.setPrenom_utilisateur(utilisateur.getPrenom_utilisateur());
            existingUser.setEmail_utilisateur(utilisateur.getEmail_utilisateur());
            existingUser.setDate_naissance(utilisateur.getDate_naissance());
            existingUser.setPays(utilisateur.getPays());
            existingUser.setGenre(utilisateur.getGenre());
            existingUser.setPassword(utilisateur.getPassword());
            existingUser.setNum_tele(utilisateur.getNum_tele());
            existingUser.setUsername(utilisateur.getUsername());
            Utilisateurs updatedUtilisateur = userRepository.save(existingUser);
            return ResponseEntity.ok(updatedUtilisateur);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    @Override
    public ResponseEntity<Void> deleteUtilisateur(Long id) {
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

	@Override
	public ResponseEntity<Utilisateurs> getUserId(Long id) {
		// TODO Auto-generated method stub
		return null;
	}
	@Override
    public Optional<Utilisateurs> findUtilisateurByUsernameAndPassword(String username, String password) {
        return userRepository.findByUsernameAndPassword(username, password);
    }
	
	@Override
	  public Optional<Utilisateurs> rechercherParUsername(String username) throws NotFoundException {
	    Optional<Utilisateurs> utilisateur = userRepository.findByUsername(username);
	    if (utilisateur == null) {
	      throw new NotFoundException();
	    }
	    return utilisateur;
	  }
}