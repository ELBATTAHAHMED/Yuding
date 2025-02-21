package com.ahmed.userservice.config;

import com.ahmed.userservice.models.Administrateurs;
import com.ahmed.userservice.models.Utilisateurs;
import com.ahmed.userservice.repositories.AdministrateursRepository;
import com.ahmed.userservice.repositories.UtilisateursRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
import java.sql.Date;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(AdministrateursRepository adminRepo, UtilisateursRepository userRepo) {
        return args -> {
            if (adminRepo.count() == 0) {
                adminRepo.saveAll(List.of(
                        new Administrateurs(null, "Ahmed", "Elbattah", "ahmed@example.com", Date.valueOf("1999-01-01"), "Maroc", "Homme", "password", 123456789L),
                        new Administrateurs(null, "Admin2", "Test", "admin2@example.com", Date.valueOf("1985-05-10"), "France", "Homme", "adminpass", 987654321L)
                ));
            }

            if (userRepo.count() == 0) {
                userRepo.saveAll(List.of(
                        new Utilisateurs(null, "User1", "Test", "user1@example.com", LocalDate.of(2000, 3, 15), "Maroc", "Femme", "userpass", "user1", "0612345678"),
                        new Utilisateurs(null, "User2", "Example", "user2@example.com", LocalDate.of(1995, 7, 20), "Tunisie", "Homme", "pass123", "user2", "0698765432")
                ));
            }
        };
    }
}
