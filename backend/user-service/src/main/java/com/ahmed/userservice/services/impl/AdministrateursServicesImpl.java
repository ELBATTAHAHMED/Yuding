package com.ahmed.userservice.services.impl;


import com.ahmed.userservice.models.Administrateurs;
import com.ahmed.userservice.repositories.AdministrateursRepository;
import com.ahmed.userservice.services.AdministrateursServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
public class AdministrateursServicesImpl implements AdministrateursServices {

    @Autowired
    private AdministrateursRepository administrateurRepository;

    @Override
    public List<Administrateurs> findAll() {
        return administrateurRepository.findAll();
    }

    @Override
    public Optional<Administrateurs> findById(Long id) {
        return administrateurRepository.findById(id);
    }

    @Override
    public Administrateurs save(Administrateurs administrateur) {
        return administrateurRepository.save(administrateur);
    }

    @Override
    public void deleteById(Long id) {
        administrateurRepository.deleteById(id);
    }

    @Override
    public Administrateurs update(Long id, Administrateurs administrateurDetails) {
        return administrateurRepository.findById(id)
            .map(administrateur -> {
                administrateur.setNom(administrateurDetails.getNom());
                administrateur.setPrenom(administrateurDetails.getPrenom());
                administrateur.setEmail(administrateurDetails.getEmail());
                administrateur.setNaissance(administrateurDetails.getNaissance());
                administrateur.setPays(administrateurDetails.getPays());
                administrateur.setGenre(administrateurDetails.getGenre());
                administrateur.setPassword(administrateurDetails.getPassword());
                administrateur.setTele(administrateurDetails.getTele());
                return administrateurRepository.save(administrateur);
            })
            .orElseThrow(() -> new RuntimeException("Admin not found with id " + id));
    }
    
    
    
    @Override
    public Optional<Administrateurs> findByEmailAndPassword(String email, String password) {
        return administrateurRepository.findByEmailAndPassword(email, password);
    }
   
}


