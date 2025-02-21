package com.ahmed.userservice.controllers;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.ahmed.userservice.models.Administrateurs;

import com.ahmed.userservice.services.AdministrateursServices;

@RestController
@RequestMapping("/apiu/admin")
public class adminController {
	 @Autowired
	    private AdministrateursServices administrateurService;

	    @GetMapping("/all")
	    public ResponseEntity<List<Administrateurs>> getAllAdministrateurs() {
	        List<Administrateurs> admins = administrateurService.findAll();
	        return new ResponseEntity<>(admins, HttpStatus.OK);
	    }

	    @GetMapping("/{id}")
	    public ResponseEntity<Administrateurs> getAdministrateurById(@PathVariable Long id) {
	        return administrateurService.findById(id)
	                .map(admin -> new ResponseEntity<>(admin, HttpStatus.OK))
	                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
	    }

	    @PostMapping("/create")
	    public ResponseEntity<Administrateurs> createAdministrateur(@RequestBody Administrateurs administrateur) {
	        Administrateurs newAdmin = administrateurService.save(administrateur);
	        return new ResponseEntity<>(newAdmin, HttpStatus.CREATED);
	    }

	    @PutMapping("/update/{id}")
	    public ResponseEntity<Administrateurs> updateAdministrateur(@PathVariable Long id, @RequestBody Administrateurs administrateurDetails) {
	        try {
	            Administrateurs updatedAdmin = administrateurService.update(id, administrateurDetails);
	            return new ResponseEntity<>(updatedAdmin, HttpStatus.OK);
	        } catch (RuntimeException e) {
	            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
	        }
	    }

	    @DeleteMapping("/delete/{id}")
	    public ResponseEntity<Void> deleteAdministrateur(@PathVariable Long id) {
	        try {
	            administrateurService.deleteById(id);
	            return new ResponseEntity<>(HttpStatus.NO_CONTENT);
	        } catch (RuntimeException e) {
	            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
	        }
	    }



	    @PostMapping("/search")
	    public ResponseEntity<Administrateurs> findByEmailAndPassword(@RequestParam String email, @RequestParam String password) {
	        return administrateurService.findByEmailAndPassword(email, password)
	                .map(admin -> new ResponseEntity<>(admin, HttpStatus.OK))
	                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
	    }

}
