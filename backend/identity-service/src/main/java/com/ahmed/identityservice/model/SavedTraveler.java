package com.ahmed.identityservice.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "saved_travelers", schema = "identity")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SavedTraveler {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(name = "public_reference", nullable = false, unique = true, length = 24)
    private String publicReference;
    @Column(name = "user_id", nullable = false)
    private UUID userId;
    @Column(name = "first_name", nullable = false, length = 100)
    private String firstName;
    @Column(name = "last_name", nullable = false, length = 100)
    private String lastName;
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
    @Column(name = "traveler_type", nullable = false, length = 12)
    private String travelerType;
    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false)
    @Builder.Default private Instant updatedAt = Instant.now();
    @PreUpdate void updateTimestamp() { updatedAt = Instant.now(); }
}
