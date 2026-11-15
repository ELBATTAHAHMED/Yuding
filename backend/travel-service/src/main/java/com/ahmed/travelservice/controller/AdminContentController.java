package com.ahmed.travelservice.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;

@RestController
@RequestMapping
@RequiredArgsConstructor
public class AdminContentController {

    private final JdbcTemplate jdbc;

    // Public endpoint for homepage carousel
    @GetMapping("/travel/destinations/featured")
    public List<Map<String, Object>> getPublicFeaturedDestinations() {
        return jdbc.queryForList("""
            SELECT id, city, country, country_label as "countryLabel",
                   editorial_title as "editorialTitle", editorial_line as "line",
                   editorial_detail as "detail", image_id as "imageId",
                   image_url as "imageUrl", target_url as "targetUrl",
                   display_order as "displayOrder"
            FROM travel.featured_destinations
            WHERE status = 'PUBLISHED'
            ORDER BY display_order ASC, created_at ASC
        """);
    }

    // Admin endpoints for Content Managers & Admins
    @GetMapping("/travel/admin/content/destinations/featured")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    public List<Map<String, Object>> getAdminFeaturedDestinations() {
        return jdbc.queryForList("""
            SELECT id, city, country, country_label as "countryLabel",
                   editorial_title as "editorialTitle", editorial_line as "line",
                   editorial_detail as "detail", image_id as "imageId",
                   image_url as "imageUrl", target_url as "targetUrl",
                   display_order as "displayOrder", status, created_at as "createdAt",
                   updated_at as "updatedAt"
            FROM travel.featured_destinations
            ORDER BY display_order ASC, created_at ASC
        """);
    }

    public record FeaturedDestinationInput(
        @NotBlank(message = "La ville est requise") String city,
        @NotBlank(message = "Le pays est requis") String country,
        @NotBlank(message = "Le libellé pays est requis") String countryLabel,
        @NotBlank(message = "Le titre éditorial est requis") String editorialTitle,
        @NotBlank(message = "L'accroche éditoriale est requise") String editorialLine,
        @NotBlank(message = "Le détail est requis") String editorialDetail,
        String imageId,
        String imageUrl,
        @NotBlank(message = "L'URL cible est requise") String targetUrl,
        Integer displayOrder,
        String status
    ) {}

    @PostMapping("/travel/admin/content/destinations/featured")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    public Map<String, Object> createFeaturedDestination(@Valid @RequestBody FeaturedDestinationInput input) {
        String status = input.status() != null && List.of("DRAFT", "PUBLISHED", "ARCHIVED").contains(input.status())
            ? input.status() : "PUBLISHED";
        int order = input.displayOrder() != null ? input.displayOrder() : 1;

        UUID id = jdbc.queryForObject("""
            INSERT INTO travel.featured_destinations
            (city, country, country_label, editorial_title, editorial_line, editorial_detail, image_id, image_url, target_url, display_order, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id
        """, UUID.class, input.city(), input.country(), input.countryLabel(), input.editorialTitle(), input.editorialLine(),
            input.editorialDetail(), input.imageId(), input.imageUrl(), input.targetUrl(), order, status);

        return Map.of("id", id, "message", "Destination mise en avant créée avec succès");
    }

    @PutMapping("/travel/admin/content/destinations/featured/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    public Map<String, Object> updateFeaturedDestination(@PathVariable UUID id, @Valid @RequestBody FeaturedDestinationInput input) {
        String status = input.status() != null && List.of("DRAFT", "PUBLISHED", "ARCHIVED").contains(input.status())
            ? input.status() : "PUBLISHED";
        int order = input.displayOrder() != null ? input.displayOrder() : 1;

        int updated = jdbc.update("""
            UPDATE travel.featured_destinations
            SET city = ?, country = ?, country_label = ?, editorial_title = ?, editorial_line = ?,
                editorial_detail = ?, image_id = ?, image_url = ?, target_url = ?, display_order = ?,
                status = ?, updated_at = now()
            WHERE id = ?
        """, input.city(), input.country(), input.countryLabel(), input.editorialTitle(), input.editorialLine(),
            input.editorialDetail(), input.imageId(), input.imageUrl(), input.targetUrl(), order, status, id);

        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Destination non trouvée");
        }
        return Map.of("id", id, "message", "Destination mise à jour avec succès");
    }

    @DeleteMapping("/travel/admin/content/destinations/featured/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MANAGER')")
    public ResponseEntity<Void> archiveFeaturedDestination(@PathVariable UUID id) {
        jdbc.update("UPDATE travel.featured_destinations SET status = 'ARCHIVED', updated_at = now() WHERE id = ?", id);
        return ResponseEntity.noContent().build();
    }

}
