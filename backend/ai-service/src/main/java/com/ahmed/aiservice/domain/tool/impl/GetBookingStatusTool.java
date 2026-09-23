package com.ahmed.aiservice.domain.tool.impl;

import com.ahmed.aiservice.client.InternalBookingClient;
import com.ahmed.aiservice.domain.tool.*;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;

import java.util.*;
import java.util.regex.Pattern;

/**
 * Read-only tool for consulting booking status from reservation-service.
 * Enforces server-side IDOR prevention by forwarding caller's JWT token
 * and applies data minimization to strip sensitive customer PII.
 */
@Component
public class GetBookingStatusTool implements AiTool {

    private static final Logger log = LoggerFactory.getLogger(GetBookingStatusTool.class);
    private static final Pattern BOOKING_REF_PATTERN = Pattern.compile("^YUD-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$");

    private static final Set<String> PAID_STATUSES = Set.of(
            "PAID",
            "PENDING_PROVIDER_CONFIRMATION",
            "CONFIRMED"
    );

    private final InternalBookingClient bookingClient;
    private final AiToolDefinition definition;

    public GetBookingStatusTool(InternalBookingClient bookingClient) {
        this.bookingClient = bookingClient;
        this.definition = new AiToolDefinition(
                "getBookingStatus",
                "Consulte le statut d'une réservation Yuding à l'aide de sa référence publique (YUD-XXXXXXXX). Nécessite d'être authentifié.",
                Map.of(
                        "type", "object",
                        "properties", Map.of(
                                "bookingReference", Map.of("type", "string", "description", "Référence publique de réservation au format YUD-XXXXXXXX")
                        ),
                        "required", List.of("bookingReference")
                )
        );
    }

    @Override
    public AiToolDefinition getDefinition() {
        return definition;
    }

    @Override
    public AiToolResult execute(AiToolCall call, AiToolExecutionContext context) {
        String callId = call.getId();
        Map<String, Object> args = call.getArguments();

        String ref = getString(args, "bookingReference");
        if (ref == null || !BOOKING_REF_PATTERN.matcher(ref.trim().toUpperCase()).matches()) {
            return AiToolResult.error(callId, "getBookingStatus",
                    "Référence de réservation invalide: '" + ref + "'. Format attendu: YUD-XXXXXXXX (8 caractères alphanumériques).");
        }
        String bookingRef = ref.trim().toUpperCase();

        // 1. Verify caller authentication (defense against IDOR & unauthenticated probing)
        if (context == null || !context.isAuthenticated()) {
            return AiToolResult.error(callId, "getBookingStatus",
                    "Authentification requise pour consulter le statut de cette réservation. Veuillez vous connecter à votre compte Yuding.");
        }

        try {
            // 2. Forward caller JWT token for server-side ownership enforcement
            JsonNode bookingNode = bookingClient.getBookingByReference(bookingRef, context.getJwtToken());
            if (bookingNode == null || bookingNode.isNull()) {
                return AiToolResult.error(callId, "getBookingStatus", "Réservation introuvable pour la référence " + bookingRef);
            }

            // 3. Data minimization: only expose non-sensitive operational status
            String status = bookingNode.path("status").asText("UNKNOWN");
            String productType = bookingNode.path("productType").asText("UNKNOWN");
            boolean isPaid = PAID_STATUSES.contains(status);

            Map<String, Object> result = new LinkedHashMap<>();
            result.put("bookingReference", bookingRef);
            result.put("status", status);
            result.put("productType", productType);
            result.put("paid", isPaid);

            log.info("Booking status retrieved securely: ref={}, status={}, productType={}",
                    bookingRef, status, productType);

            return AiToolResult.success(callId, "getBookingStatus", result);

        } catch (HttpClientErrorException e) {
            if (e.getStatusCode() == org.springframework.http.HttpStatus.NOT_FOUND ||
                e.getStatusCode() == org.springframework.http.HttpStatus.FORBIDDEN) {
                log.warn("Access denied or booking not found: ref={}, status={}", bookingRef, e.getStatusCode());
                return AiToolResult.error(callId, "getBookingStatus",
                        "Réservation introuvable ou vous n'êtes pas autorisé à la consulter.");
            } else if (e.getStatusCode() == org.springframework.http.HttpStatus.UNAUTHORIZED) {
                return AiToolResult.error(callId, "getBookingStatus",
                        "Session expirée ou jeton d'authentification invalide. Veuillez vous reconnecter.");
            }
            return AiToolResult.error(callId, "getBookingStatus",
                    "Erreur lors de la vérification de la réservation: " + e.getMessage());
        } catch (Exception e) {
            log.error("Failed to query booking {}: {}", bookingRef, e.getMessage());
            return AiToolResult.error(callId, "getBookingStatus",
                    "Erreur lors de la vérification de la réservation: " + e.getMessage());
        }
    }

    private String getString(Map<String, Object> args, String key) {
        Object val = args.get(key);
        return val != null ? val.toString() : null;
    }
}
