package com.ahmed.identityservice.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.Map;

@Component
@Primary
public class HttpNotificationAdapter implements NotificationPort {

    private static final Logger log = LoggerFactory.getLogger(HttpNotificationAdapter.class);

    private final RestClient restClient;
    private final String frontendBaseUrl;

    public HttpNotificationAdapter(
            @Value("${yuding.notification.service-url:http://localhost:8085}") String serviceUrl,
            @Value("${yuding.notification.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .build();
        this.frontendBaseUrl = frontendBaseUrl;
    }

    @Override
    public void sendEmailVerification(String email, String token) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "VERIFY_ACCOUNT");
            payload.put("recipientEmail", email);
            payload.put("idempotencyKey", "VERIFY_ACCOUNT:" + sha256Hex(token));
            Map<String, Object> params = new HashMap<>();
            params.put("verificationLink", frontendBaseUrl + "/verify-email?token=" + token);
            params.put("expiresInMinutes", 60);
            payload.put("parameters", params);

            restClient.post()
                    .uri("/internal/notifications/events")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("HttpNotificationAdapter: Dispatched VERIFY_ACCOUNT notification for email [{}]", maskEmail(email));
        } catch (Exception ex) {
            log.warn("HttpNotificationAdapter: Failed to dispatch VERIFY_ACCOUNT notification for [{}]: {}",
                    maskEmail(email), ex.getMessage());
        }
    }

    @Override
    public void sendPasswordReset(String email, String token) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "RESET_PASSWORD");
            payload.put("recipientEmail", email);
            payload.put("idempotencyKey", "RESET_PASSWORD:" + sha256Hex(token));
            Map<String, Object> params = new HashMap<>();
            params.put("resetLink", frontendBaseUrl + "/reset-password?token=" + token);
            params.put("expiresInMinutes", 30);
            payload.put("parameters", params);

            restClient.post()
                    .uri("/internal/notifications/events")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .toBodilessEntity();
            log.info("HttpNotificationAdapter: Dispatched RESET_PASSWORD notification for email [{}]", maskEmail(email));
        } catch (Exception ex) {
            log.warn("HttpNotificationAdapter: Failed to dispatch RESET_PASSWORD notification for [{}]: {}",
                    maskEmail(email), ex.getMessage());
        }
    }

    private String sha256Hex(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            return String.valueOf(input.hashCode());
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int at = email.indexOf('@');
        return email.substring(0, Math.min(2, at)) + "***" + email.substring(at);
    }
}
