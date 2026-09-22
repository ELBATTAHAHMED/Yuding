package com.ahmed.reservationservice.domain.payment.webhook;

import com.ahmed.reservationservice.domain.config.PaymentProperties;
import com.ahmed.reservationservice.domain.payment.provider.PayPalSandboxPaymentProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

/**
 * Validates PayPal Sandbox webhook signatures via official PayPal verification API:
 * POST /v1/notifications/verify-webhook-signature
 * Strictly enforces official PayPal headers and registered PAYPAL_WEBHOOK_ID.
 */
@Component
@Slf4j
public class PayPalWebhookSignatureVerifier {

    public static final String HEADER_AUTH_ALGO = "PAYPAL-AUTH-ALGO";
    public static final String HEADER_CERT_URL = "PAYPAL-CERT-URL";
    public static final String HEADER_TRANSMISSION_ID = "PAYPAL-TRANSMISSION-ID";
    public static final String HEADER_TRANSMISSION_SIG = "PAYPAL-TRANSMISSION-SIG";
    public static final String HEADER_TRANSMISSION_TIME = "PAYPAL-TRANSMISSION-TIME";

    private final PaymentProperties paymentProperties;
    private final PayPalSandboxPaymentProvider payPalPaymentProvider;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public PayPalWebhookSignatureVerifier(
            PaymentProperties paymentProperties,
            PayPalSandboxPaymentProvider payPalPaymentProvider,
            RestTemplate restTemplate) {
        this.paymentProperties = paymentProperties;
        this.payPalPaymentProvider = payPalPaymentProvider;
        this.restTemplate = restTemplate != null ? restTemplate : new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * Cryptographically verifies the webhook signature using PayPal's verification endpoint.
     *
     * @param headers Inbound HTTP headers from PayPal
     * @param rawBody Inbound raw JSON string received from PayPal
     * @return true if PayPal verifies the signature as SUCCESS; false otherwise
     */
    public boolean verifySignature(HttpHeaders headers, String rawBody) {
        if (headers == null || rawBody == null || rawBody.isBlank()) {
            log.warn("PayPalWebhookVerifier: Rejected webhook - headers or body is empty.");
            return false;
        }

        String authAlgo = getHeaderCaseInsensitive(headers, HEADER_AUTH_ALGO);
        String certUrl = getHeaderCaseInsensitive(headers, HEADER_CERT_URL);
        String transmissionId = getHeaderCaseInsensitive(headers, HEADER_TRANSMISSION_ID);
        String transmissionSig = getHeaderCaseInsensitive(headers, HEADER_TRANSMISSION_SIG);
        String transmissionTime = getHeaderCaseInsensitive(headers, HEADER_TRANSMISSION_TIME);

        if (isBlank(authAlgo) || isBlank(certUrl) || isBlank(transmissionId) || isBlank(transmissionSig) || isBlank(transmissionTime)) {
            log.warn("PayPalWebhookVerifier: Rejected webhook - missing required PayPal transmission signature headers. (transmissionId={})",
                    transmissionId != null ? transmissionId : "MISSING");
            return false;
        }

        String webhookId = paymentProperties.getPaypal().getWebhookId();
        if (isBlank(webhookId)) {
            log.warn("PayPalWebhookVerifier: Rejected webhook - PAYPAL_WEBHOOK_ID is not configured in local environment.");
            return false;
        }

        try {
            JsonNode webhookEventNode = objectMapper.readTree(rawBody);

            Map<String, Object> verificationPayload = new HashMap<>();
            verificationPayload.put("auth_algo", authAlgo);
            verificationPayload.put("cert_url", certUrl);
            verificationPayload.put("transmission_id", transmissionId);
            verificationPayload.put("transmission_sig", transmissionSig);
            verificationPayload.put("transmission_time", transmissionTime);
            verificationPayload.put("webhook_id", webhookId);
            verificationPayload.put("webhook_event", webhookEventNode);

            String accessToken = payPalPaymentProvider.getAccessToken();
            HttpHeaders requestHeaders = new HttpHeaders();
            requestHeaders.setContentType(MediaType.APPLICATION_JSON);
            requestHeaders.setBearerAuth(accessToken);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(verificationPayload, requestHeaders);
            String baseUrl = resolveBaseUrl();

            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/v1/notifications/verify-webhook-signature",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode responseNode = objectMapper.readTree(response.getBody());
            String verificationStatus = responseNode.path("verification_status").asText();

            boolean isSuccess = "SUCCESS".equalsIgnoreCase(verificationStatus);
            if (isSuccess) {
                log.info("PayPalWebhookVerifier: Signature verification SUCCESS for transmissionId [{}]", transmissionId);
            } else {
                log.warn("PayPalWebhookVerifier: Signature verification FAILED (status={}) for transmissionId [{}]",
                        verificationStatus, transmissionId);
            }
            return isSuccess;

        } catch (HttpStatusCodeException e) {
            log.error("PayPalWebhookVerifier: Verification API error HTTP [{}] for transmissionId [{}]: {}",
                    e.getStatusCode(), transmissionId, e.getResponseBodyAsString());
            return false;
        } catch (Exception e) {
            log.error("PayPalWebhookVerifier: Unexpected error verifying signature for transmissionId [{}]: {}",
                    transmissionId, e.getMessage());
            return false;
        }
    }

    private String getHeaderCaseInsensitive(HttpHeaders headers, String headerName) {
        String val = headers.getFirst(headerName);
        if (val != null) return val;
        for (Map.Entry<String, java.util.List<String>> entry : headers.entrySet()) {
            if (entry.getKey().equalsIgnoreCase(headerName) && !entry.getValue().isEmpty()) {
                return entry.getValue().get(0);
            }
        }
        return null;
    }

    private boolean isBlank(String s) {
        return s == null || s.trim().isEmpty();
    }

    private String resolveBaseUrl() {
        String url = paymentProperties.getPaypal().getBaseUrl();
        if (url == null || url.isBlank() || (url.contains("api-m.paypal.com") && !url.contains("sandbox"))) {
            return "https://api-m.sandbox.paypal.com";
        }
        return url;
    }
}
