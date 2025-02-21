package com.ahmed.alertsservice.config;

import com.ahmed.alertsservice.models.Commentaires;
import com.ahmed.alertsservice.repositories.CommentaireRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDateTime;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase( CommentaireRepository commentairesRepo) {
        return args -> {


            if (commentairesRepo.count() == 0) {
                commentairesRepo.saveAll(List.of(
                        new Commentaires(null, "Great alert!", LocalDateTime.now(), "user1", "user1@example.com"),
                        new Commentaires(null, "Very informative", LocalDateTime.now().minusHours(2), "user2", "user2@example.com")
                ));
            }
        };
    }
}
