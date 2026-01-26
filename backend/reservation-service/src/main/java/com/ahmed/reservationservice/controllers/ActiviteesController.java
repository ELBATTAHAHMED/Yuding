package com.ahmed.reservationservice.controllers;


import java.io.IOException;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.Date;
import java.util.List;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.models.Transports;
import com.ahmed.reservationservice.services.ActiviteesServices;

import jakarta.servlet.http.HttpServletResponse;


@RestController
@RequestMapping("/apir/activities")
public class ActiviteesController {

    @Autowired
    private ActiviteesServices activityService;

    @GetMapping("/all")
    public List<Activitees> getAllActivities() {
        return activityService.getAllActivities();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Activitees> getActivityById(@PathVariable Long id)
            throws ResourceNotFoundException {
        Activitees activity = activityService.getActivityById(id);
        return ResponseEntity.ok(activity);
    }
   
    @PostMapping("/create")
    public ResponseEntity<Activitees> createActivite(@RequestBody Activitees activitees) {
        Activitees createdActivite = activityService.createActivite(activitees);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdActivite);
    }


    @PutMapping("/update/{id}")
    public ResponseEntity<Activitees> updateActivite(@PathVariable Long id, @RequestBody Activitees activitees)
            throws ResourceNotFoundException {
        Activitees updatedActivite = activityService.updateActivite(id, activitees);
        return ResponseEntity.ok(updatedActivite);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteActivite(@PathVariable Long id) {
    	activityService.deleteActivite(id);
        return ResponseEntity.noContent().build();
    }

    
    
    @PostMapping("/search1")
    public ResponseEntity<List<Activitees>> getActiviteesByPaysAndVille(@RequestParam String pays, @RequestParam String ville) {
        List<Activitees> activitees = activityService.searchActivitesByPaysAndVille(pays, ville);
        if (activitees.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activitees);
    }
    
    @PostMapping("/search")
    public ResponseEntity<List<Activitees>> searchActivities(
            @RequestParam String pays,
            @RequestParam String ville,
            @RequestParam  Date date) {
        List<Activitees> activitees = activityService.findByPaysAndVilleAndDate(pays, ville, date);
        if (activitees.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activitees);
    }
    


}
