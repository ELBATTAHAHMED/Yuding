package com.ahmed.reservationservice.config;

import com.ahmed.reservationservice.models.Activitees;
import com.ahmed.reservationservice.models.Hebergements;
import com.ahmed.reservationservice.models.Paiements;
import com.ahmed.reservationservice.models.Reservations;
import com.ahmed.reservationservice.models.Transports;
import com.ahmed.reservationservice.repositories.ActiviteesRepository;
import com.ahmed.reservationservice.repositories.HebergementsRepository;
import com.ahmed.reservationservice.repositories.PaiementsRepository;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.repositories.TransportsRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.sql.Date;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initDatabase(ActiviteesRepository activiteesRepo,
                                   HebergementsRepository hebergementsRepo,
                                   TransportsRepository transportsRepo,
                                   ReservationRepository reservationsRepo,
                                   PaiementsRepository paiementsRepo) {
        return args -> {
            if (activiteesRepo.count() == 0) {
                activiteesRepo.saveAll(List.of(
                        new Activitees(null, 150.0, "Marrakech", "Excursion dans les montagnes, une aventure inoubliable à travers les magnifiques montagnes marocaines. Cette activité vous emmène sur des sentiers pittoresques, où vous pourrez admirer des paysages époustouflants, respirer l'air frais de la montagne et découvrir la faune et la flore locales.", "2 heures", "Voyage Maroc", "Maroc", Date.valueOf("2025-05-01"), "0667894561", "url_photo"),
                        new Activitees(null, 200.0, "Fès", "Visite culturelle, une immersion dans l’histoire et la richesse culturelle de la ville de Fès à travers une visite guidée exceptionnelle. Découvrez les trésors architecturaux, les médersas anciennes, les souks animés et les secrets de l’artisanat local tout en écoutant des récits fascinants sur l’héritage de cette ville impériale.", "3 heures", "Explore Maroc", "Maroc", Date.valueOf("2025-06-15"), "0671234567", "url_photo")
                ));
            }

            if (hebergementsRepo.count() == 0) {
                hebergementsRepo.saveAll(List.of(
                        new Hebergements(null, "Hotel Atlas", "Hôtel", "Rue Atlas, Marrakech", "Un hôtel 4 étoiles situé à Marrakech, offrant un confort exceptionnel et des services haut de gamme. Idéal pour les voyageurs à la recherche d’un séjour agréable, l’établissement propose des chambres modernes, une cuisine raffinée et des installations de détente.", 80.0f, 2, "Voyage Maroc", 0601234567L, "Marrakech", "Maroc", List.of("photo1.jpg", "photo2.jpg")),
                        new Hebergements(null, "Riad Fès", "Riad", "Rue des Écoles, Fès", "Un riad traditionnel au cœur de la médina de Fès, offrant une expérience authentique dans un cadre enchanteur. Avec son architecture typiquement marocaine, ses patios décorés et son ambiance paisible, cet établissement est parfait pour une immersion culturelle et un séjour mémorable.", 120.0f, 4, "Explore Maroc", 0603334567L, "Fès", "Maroc", List.of("photo3.jpg", "photo4.jpg"))
                ));
            }

            if (transportsRepo.count() == 0) {
                transportsRepo.saveAll(List.of(
                       new Transports(null, "Avion", "Volez confortablement à bord d'un Boeing 737 de Royal Air Maroc pour un vol direct entre Casablanca et Marrakech. Profitez d'un service de qualité supérieure et d'une expérience agréable tout en traversant les cieux marocains. L'avion vous amène rapidement à destination, avec une vue imprenable depuis le ciel.", "Royal Air Maroc", "Casablanca", "Marrakech", "Aéroport", "Boeing 737", 800, "RAM", "0644444444", "Maroc", "Casablanca", "Maroc", "Marrakech", List.of("avion.jpg")),
                       new Transports(null, "Train", "Montez à bord du TGV Al Boraq, le train ultra-rapide de l'ONCF reliant Casablanca à Marrakech. Expérimentez une connexion rapide et confortable tout en traversant les paysages marocains. Le confort et la modernité du train Al Boraq vous garantissent un trajet agréable et efficace entre les deux villes emblématiques.", "ONCF", "Casablanca", "Marrakech", "Gare", "Al Boraq", 200, "ONCF", "0655555555", "Maroc", "Casablanca", "Maroc", "Marrakech", List.of("train.jpg"))
                ));
            }

            if (reservationsRepo.count() == 0) {
                reservationsRepo.saveAll(List.of(
                        new Reservations(null, Date.valueOf("2025-05-01"), 2L, activiteesRepo.findById(1L).orElse(null), transportsRepo.findById(1L).orElse(null), hebergementsRepo.findById(1L).orElse(null), 300.0, 2.0, 1L),
                        new Reservations(null, Date.valueOf("2025-06-15"), 3L, activiteesRepo.findById(2L).orElse(null), transportsRepo.findById(2L).orElse(null), hebergementsRepo.findById(2L).orElse(null), 480.0, 4.0, 2L)
                ));
            }

            if (paiementsRepo.count() == 0) {
                // Récupérer les réservations existantes
                Reservations reservation1 = reservationsRepo.findById(1L).orElseThrow();
                Reservations reservation2 = reservationsRepo.findById(2L).orElseThrow();

                paiementsRepo.saveAll(List.of(
                        new Paiements(
                                null,
                                reservation1.getIdr(), // ID réservation
                                reservation1.getPrixtot(), // Montant
                                "credit card",
                                "1234567812345678",
                                Date.valueOf("2025-05-01"),
                                123L
                        ),
                        new Paiements(
                                null,
                                reservation2.getIdr(),
                                reservation2.getPrixtot(),
                                "PayPal",
                                "pending",
                                Date.valueOf("2025-06-15"),
                                456L
                        )
                ));
            }
        };
    }
}
