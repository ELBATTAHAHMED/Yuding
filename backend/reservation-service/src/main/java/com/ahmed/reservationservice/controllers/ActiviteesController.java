package com.ahmed.reservationservice.controllers;

import java.util.Date;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.services.ActiviteesServices;

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
   
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    @PostMapping("/create")
    public ResponseEntity<Activitees> createActivite(@RequestBody Activitees activitees) {
        Activitees createdActivite = activityService.createActivite(activitees);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdActivite);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    @PutMapping("/update/{id}")
    public ResponseEntity<Activitees> updateActivite(@PathVariable Long id, @RequestBody Activitees activitees)
            throws ResourceNotFoundException {
        Activitees updatedActivite = activityService.updateActivite(id, activitees);
        return ResponseEntity.ok(updatedActivite);
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
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
            @RequestParam Date date) {
        List<Activitees> activitees = activityService.findByPaysAndVilleAndDate(pays, ville, date);
        if (activitees.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(activitees);
    }
}
