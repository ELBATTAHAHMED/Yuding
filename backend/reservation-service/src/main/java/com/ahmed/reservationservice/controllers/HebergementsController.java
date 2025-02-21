package com.ahmed.reservationservice.controllers;

import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.Hebergements;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.services.HebergementsServices;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/apir/hebergements")
public class HebergementsController {

    private final HebergementsServices hebergementsServices;

    @Autowired
    public HebergementsController(HebergementsServices hebergementsServices) {
        this.hebergementsServices = hebergementsServices;
    }



   
   

    @GetMapping("/all")
    public ResponseEntity<List<Hebergements>> getAllHebergements() {
        List<Hebergements> hebergements = hebergementsServices.getAllHebergements();
        return ResponseEntity.ok(hebergements);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Hebergements> getHebergementById(@PathVariable Long id) {
        try {
            Hebergements hebergement = hebergementsServices.getHebergementById(id);
            return ResponseEntity.ok(hebergement);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    
    @PostMapping("/create")
    public ResponseEntity<Hebergements> createHebergement(@RequestBody Hebergements hebergement) {
      Hebergements createdHebergement = hebergementsServices.createHebergement(hebergement);
      return new ResponseEntity<>(createdHebergement, HttpStatus.CREATED);
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteHebergement(@PathVariable Long id) {
        hebergementsServices.deleteHebergement(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<Hebergements> updateHebergement(@PathVariable Long id, @RequestBody Hebergements hebergementRequest) {
        try {
            Hebergements updatedHebergement = hebergementsServices.updateHebergement(id, hebergementRequest);
            return ResponseEntity.ok(updatedHebergement);
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    

    @PostMapping("/search")
    public ResponseEntity<List<Hebergements>> searchHebergementsByPaysVille(
        @RequestParam String pays, @RequestParam String ville) {
        try {
            List<Hebergements> hebergements = hebergementsServices.findHebergementsByPaysVille(pays, ville);
            if (hebergements.isEmpty()) {
                return new ResponseEntity<>(HttpStatus.NOT_FOUND); // Retourne 404 si aucun hébergement n'est trouvé
            }
            return ResponseEntity.ok(hebergements);
        } catch (Exception e) {
            e.printStackTrace();
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR); // Assurez-vous de loguer l'exception
        }
    }

}