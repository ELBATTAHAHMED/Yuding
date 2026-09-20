package com.ahmed.reservationservice.feigh;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "IDENTITY-SERVICE")
public interface UtilisateurFeign {

    @GetMapping("/apiu/utilisateurs/id/{id}")
    UtilisateursFeign getUtilisateurById(@PathVariable("id") Long id);
}
