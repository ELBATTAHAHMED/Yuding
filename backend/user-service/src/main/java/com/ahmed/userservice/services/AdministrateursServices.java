package com.ahmed.userservice.services;
import com.ahmed.userservice.models.Administrateurs;
import java.util.List;
import java.util.Optional;

public interface AdministrateursServices {

	    List<Administrateurs> findAll();
	    Optional<Administrateurs> findById(Long id);
	    Administrateurs save(Administrateurs administrateur);
	    void deleteById(Long id);
	    Administrateurs update(Long id, Administrateurs administrateurDetails);
	    
	    Optional<Administrateurs> findByEmailAndPassword(String email, String password);
	    
}


