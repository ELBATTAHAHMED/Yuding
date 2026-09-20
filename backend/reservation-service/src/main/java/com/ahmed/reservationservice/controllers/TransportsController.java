package com.ahmed.reservationservice.controllers;

import java.util.List;
import java.util.stream.Collectors;


import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
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

import com.ahmed.reservationservice.models.ResourceNotFoundException;
import com.ahmed.reservationservice.models.Transports;
import com.ahmed.reservationservice.services.TransportsServices;

@RestController
@RequestMapping("/apir/transports")
public class TransportsController {

    @Autowired
    private TransportsServices transportsServices;

    @GetMapping("/all")
    public List<Transports> getAllTransports() {
        return transportsServices.getAllTransports();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transports> getTransportById(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(transportsServices.getTransportById(id));
        } catch (ResourceNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    @PostMapping("/create")
    public Transports createTransport(@RequestBody Transports transport) {
        return transportsServices.createTransport(transport);
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> deleteTransport(@PathVariable(value = "id") Long id) throws ResourceNotFoundException {
        transportsServices.deleteTransport(id);
        return ResponseEntity.ok().build();
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    @PutMapping("/update/{id}")
    public ResponseEntity<Transports> updateTransport(@PathVariable(value = "id") Long id, @RequestBody Transports transportRequest)
    		throws ResourceNotFoundException {
        Transports transport = transportsServices.updateTransport(id, transportRequest);
        return ResponseEntity.ok().body(transport);
    }


    @PostMapping("/search/ville")
    public ResponseEntity<List<Transports>> searchTransportsByVille(@RequestParam(value = "ville") String ville) {
        List<Transports> transports = transportsServices.searchTransportsByVille(ville);

        // Filtrage des transports pour ne garder que ceux de type "Location"
        List<Transports> locationTransports = transports.stream()
                .filter(transport -> "Location".equalsIgnoreCase(transport.getType_transport()))
                .collect(Collectors.toList());

        if (locationTransports.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(locationTransports);
    }


    @PostMapping("/search")
    public List<Transports> getTransportsByCriteria(@RequestParam String pays, @RequestParam String lieudepp, @RequestParam String lieuarr) {
        return transportsServices.findTransportByCriteria(pays, lieudepp, lieuarr);
    }

    @PostMapping("/search1")
    public List<Transports> searchTransports(
            @RequestParam String pays,
            @RequestParam String ville,
            @RequestParam String villearr,
            @RequestParam String paysarr) {
        List<Transports> transports = transportsServices.searchTransports(pays, ville, villearr, paysarr);

        // Filtrage des transports pour ne garder que ceux de type "Avion"
        return transports.stream()
                .filter(transport -> "Avion".equalsIgnoreCase(transport.getType_transport()))
                .collect(Collectors.toList());
    }


    @PostMapping("/search2")
    public List<Transports> searchTransportsByPaysAndVille(
            @RequestParam String pays,
            @RequestParam String ville) {
        List<Transports> transports = transportsServices.searchTransportsByPaysAndVille(pays, ville);

        // Filtrage des transports pour ne garder que ceux de type "Taxi"
        return transports.stream()
                .filter(transport -> "Taxi".equalsIgnoreCase(transport.getType_transport()))
                .collect(Collectors.toList());
    }

    @PostMapping("/search3")
    public List<Transports> searchTransportsByPaysVilleLieuarr(
            @RequestParam String pays,
            @RequestParam String ville,
            @RequestParam String lieuarr) {
        List<Transports> transports = transportsServices.searchTransportsByPaysVilleLieuarr(pays, ville, lieuarr);

        // Filtrage des transports pour ne garder que ceux de type "Train"
        List<Transports> trains = transports.stream()
                .filter(transport -> "Train".equalsIgnoreCase(transport.getType_transport()))
                .collect(Collectors.toList());

        return trains;
    }


}
