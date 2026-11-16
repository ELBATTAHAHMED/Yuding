package com.ahmed.identityservice.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
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
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(4));
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .requestFactory(requestFactory)
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
            params.put("expiresInMinutes", 24 * 60);
            params.put("expiresInLabel", "24 heures");
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
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Le service e-mail est momentanément indisponible. Réessayez dans quelques instants.");
        }
    }

    @Override
    public void sendPasswordReset(String email, String verificationCode) {
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "RESET_PASSWORD");
            payload.put("recipientEmail", email);
            payload.put("idempotencyKey", "RESET_PASSWORD:" + sha256Hex(verificationCode));
            Map<String, Object> params = new HashMap<>();
            params.put("verificationCode", verificationCode);
            params.put("expiresInMinutes", 15);
            params.put("expiresInLabel", "15 minutes");
            String publicFrontendBaseUrl = frontendBaseUrl.contains("localhost") || frontendBaseUrl.contains("127.0.0.1")
                    ? "https://app.yuding.ma"
                    : frontendBaseUrl;
            params.put("logoUrl", publicFrontendBaseUrl + "/image/yuding-logo-ai-inverse-green.png");
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
