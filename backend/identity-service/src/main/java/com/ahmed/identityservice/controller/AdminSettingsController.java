package com.ahmed.identityservice.controller;

import com.ahmed.identityservice.service.AuditService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.regex.Pattern;

@Slf4j
@RestController
@RequestMapping("/admin/settings")
@RequiredArgsConstructor
public class AdminSettingsController {

    private final JdbcTemplate jdbcTemplate;
    private final AuditService auditService;

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");

    public record SettingItem(
            String key,
            String value,
            String description,
            OffsetDateTime updatedAt,
            UUID updatedBy
    ) {}

    public record UpdateSettingsRequest(
            @NotNull Map<String, String> settings
    ) {}

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPPORT')")
    public List<SettingItem> getSettings() {
        return jdbcTemplate.query("""
            SELECT key, value, description, updated_at, updated_by
            FROM identity.platform_settings
            ORDER BY key ASC
        """, (rs, rowNum) -> new SettingItem(
                rs.getString("key"),
                rs.getString("value"),
                rs.getString("description"),
                rs.getObject("updated_at", OffsetDateTime.class),
                rs.getObject("updated_by", UUID.class)
        ));
    }

    @PutMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<SettingItem> updateSettings(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateSettingsRequest request
    ) {
        UUID adminId = null;
        if (jwt != null) {
            try {
                adminId = UUID.fromString(jwt.getSubject());
            } catch (Exception ignored) {}
        }

        Map<String, String> input = request.settings();
        if (input == null || input.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Aucun paramètre fourni pour la mise à jour");
        }

        List<String> updatedKeys = new ArrayList<>();

        for (Map.Entry<String, String> entry : input.entrySet()) {
            String key = entry.getKey();
            String val = entry.getValue() != null ? entry.getValue().trim() : "";

            validateSetting(key, val);

            int count = jdbcTemplate.update("""
                UPDATE identity.platform_settings
                SET value = ?, updated_at = now(), updated_by = ?
                WHERE key = ?
            """, val, adminId, key);

            if (count > 0) {
                updatedKeys.add(key);
            } else {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paramètre inconnu: " + key);
            }
        }

        if (!updatedKeys.isEmpty() && adminId != null) {
            String metadata = "{\"updatedKeys\": " + updatedKeys + "}";
            auditService.logAdminAction(
                    adminId,
                    "UPDATE_SETTINGS",
                    "identity-service",
                    "PLATFORM_SETTINGS",
                    "GLOBAL",
                    "Modification de paramètres opérationnels: " + String.join(", ", updatedKeys),
                    metadata
            );
        }

        return getSettings();
    }

    private void validateSetting(String key, String val) {
        switch (key) {
            case "maintenance_mode":
            case "ai_assistant_enabled":
                if (!"true".equalsIgnoreCase(val) && !"false".equalsIgnoreCase(val)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le paramètre " + key + " doit valoir 'true' ou 'false'");
                }
                break;

            case "booking_auto_expiry_minutes":
                try {
                    int minutes = Integer.parseInt(val);
                    if (minutes < 5 || minutes > 1440) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "L'expiration automatique doit être comprise entre 5 et 1440 minutes");
                    }
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valeur numérique invalide pour " + key);
                }
                break;

            case "refund_grace_hours":
                try {
                    int hours = Integer.parseInt(val);
                    if (hours < 0 || hours > 168) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le délai de grâce de remboursement doit être compris entre 0 et 168 heures");
                    }
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valeur numérique invalide pour " + key);
                }
                break;

            case "support_email":
                if (!EMAIL_PATTERN.matcher(val).matches()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Adresse email de support invalide");
                }
                break;

            case "max_travelers_per_booking":
                try {
                    int travelers = Integer.parseInt(val);
                    if (travelers < 1 || travelers > 50) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Le nombre maximum de voyageurs doit être compris entre 1 et 50");
                    }
                } catch (NumberFormatException e) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Valeur numérique invalide pour " + key);
                }
                break;

            default:
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Paramètre non autorisé ou non configurable: " + key);
        }
    }
}
