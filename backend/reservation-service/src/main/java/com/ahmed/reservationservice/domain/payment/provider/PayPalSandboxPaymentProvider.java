package com.ahmed.reservationservice.domain.payment.provider;

import com.ahmed.reservationservice.domain.config.PaymentProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * PayPal Sandbox Payment Provider.
 * Integrates with PayPal REST API v2 in SANDBOX mode only.
 * Strictly enforces https://api-m.sandbox.paypal.com.
 * Sanitizes all logs to prevent credential leakage.
 */
@Component("paypalSandboxPaymentProvider")
@Slf4j
public class PayPalSandboxPaymentProvider implements PaymentProvider {

    public static final String PROVIDER_NAME = "paypal-sandbox";

    private final PaymentProperties paymentProperties;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    // In-memory token cache
    private volatile String cachedAccessToken;
    private volatile Instant tokenExpiresAt = Instant.EPOCH;

    public PayPalSandboxPaymentProvider(PaymentProperties paymentProperties, RestTemplate restTemplate) {
        this.paymentProperties = paymentProperties;
        this.restTemplate = restTemplate != null ? restTemplate : new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    @Override
    public String getProviderName() {
        return PROVIDER_NAME;
    }

    @Override
    public PaymentOrderResult createPaymentOrder(PaymentOrderCommand command) {
        String baseUrl = resolveBaseUrl();
        log.info("PayPalSandbox: Initiating order creation for booking [{}] ref [{}] amount [{} {}] via [{}]",
                command.getBookingReference(), command.getPaymentReference(), command.getAmount(), command.getCurrency(), baseUrl);

        try {
            String accessToken = getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);
            if (command.getProviderRequestId() != null && !command.getProviderRequestId().isBlank()) {
                headers.set("PayPal-Request-Id", command.getProviderRequestId());
            }

            // Construct PayPal v2 order request body
            Map<String, Object> amountMap = new HashMap<>();
            amountMap.put("currency_code", command.getCurrency());
            amountMap.put("value", command.getAmount().toPlainString());

            Map<String, Object> purchaseUnit = new HashMap<>();
            purchaseUnit.put("reference_id", command.getPaymentReference());
            purchaseUnit.put("description", "Yuding Booking " + command.getBookingReference());
            purchaseUnit.put("amount", amountMap);

            Map<String, Object> appContext = new HashMap<>();
            appContext.put("brand_name", "Yuding");
            appContext.put("landing_page", "NO_PREFERENCE");
            appContext.put("user_action", "PAY_NOW");
            if (command.getReturnUrl() != null) {
                appContext.put("return_url", command.getReturnUrl());
            }
            if (command.getCancelUrl() != null) {
                appContext.put("cancel_url", command.getCancelUrl());
            }

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("intent", "CAPTURE");
            requestBody.put("purchase_units", List.of(purchaseUnit));
            requestBody.put("application_context", appContext);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/v2/checkout/orders",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            String orderId = root.path("id").asText();
            String status = root.path("status").asText();

            String approvalUrl = null;
            JsonNode links = root.path("links");
            if (links.isArray()) {
                for (JsonNode link : links) {
                    if ("approve".equalsIgnoreCase(link.path("rel").asText())) {
                        approvalUrl = link.path("href").asText();
                        break;
                    }
                }
            }

            log.info("PayPalSandbox: Order created successfully [orderId={}, status={}, hasApprovalUrl={}]",
                    orderId, status, approvalUrl != null);
            return PaymentOrderResult.success(orderId, approvalUrl, orderId, status);

        } catch (HttpStatusCodeException e) {
            log.error("PayPalSandbox: Failed to create order. Status: [{}], Response: [{}]",
                    e.getStatusCode(), sanitizeError(e.getResponseBodyAsString()));
            return PaymentOrderResult.failure("PayPal order creation failed: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("PayPalSandbox: Unexpected error during order creation: {}", e.getMessage());
            return PaymentOrderResult.failure("PayPal order creation error: " + e.getMessage());
        }
    }

    @Override
    public PaymentCaptureResult capturePaymentOrder(PaymentCaptureCommand command) {
        String baseUrl = resolveBaseUrl();
        log.info("PayPalSandbox: Capturing order [{}] ref [{}] via [{}]",
                command.getProviderOrderId(), command.getPaymentReference(), baseUrl);

        try {
            String accessToken = getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);
            if (command.getProviderRequestId() != null && !command.getProviderRequestId().isBlank()) {
                headers.set("PayPal-Request-Id", command.getProviderRequestId());
            }

            HttpEntity<String> entity = new HttpEntity<>("{}", headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/v2/checkout/orders/" + command.getProviderOrderId() + "/capture",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            String status = root.path("status").asText();

            String captureId = null;
            JsonNode purchaseUnits = root.path("purchase_units");
            if (purchaseUnits.isArray() && !purchaseUnits.isEmpty()) {
                JsonNode captures = purchaseUnits.get(0).path("payments").path("captures");
                if (captures.isArray() && !captures.isEmpty()) {
                    captureId = captures.get(0).path("id").asText();
                }
            }

            if ("COMPLETED".equalsIgnoreCase(status)) {
                log.info("PayPalSandbox: Order capture completed successfully [orderId={}, captureId={}]",
                        command.getProviderOrderId(), captureId);
                return PaymentCaptureResult.success(captureId != null ? captureId : command.getProviderOrderId(), status);
            } else {
                log.warn("PayPalSandbox: Order capture returned non-completed status [orderId={}, status={}]",
                        command.getProviderOrderId(), status);
                return PaymentCaptureResult.failure("PayPal order status: " + status);
            }

        } catch (HttpStatusCodeException e) {
            log.error("PayPalSandbox: Failed to capture order [{}]. Status: [{}], Response: [{}]",
                    command.getProviderOrderId(), e.getStatusCode(), sanitizeError(e.getResponseBodyAsString()));
            return PaymentCaptureResult.failure("PayPal capture failed: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("PayPalSandbox: Unexpected error capturing order [{}]: {}",
                    command.getProviderOrderId(), e.getMessage());
            return PaymentCaptureResult.failure("PayPal capture error: " + e.getMessage());
        }
    }

    @Override
    public PaymentRefundResult refundPayment(PaymentRefundCommand command) {
        String baseUrl = resolveBaseUrl();
        log.info("PayPalSandbox: Refunding capture [{}] ref [{}] amount [{} {}] via [{}]",
                command.getCaptureId(), command.getPaymentReference(), command.getAmount(), command.getCurrency(), baseUrl);

        try {
            String accessToken = getAccessToken();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(accessToken);
            if (command.getProviderRequestId() != null && !command.getProviderRequestId().isBlank()) {
                headers.set("PayPal-Request-Id", command.getProviderRequestId());
            }

            Map<String, Object> requestBody = new HashMap<>();
            if (command.getAmount() != null && command.getCurrency() != null) {
                Map<String, String> amountMap = new HashMap<>();
                amountMap.put("value", command.getAmount().toPlainString());
                amountMap.put("currency_code", command.getCurrency());
                requestBody.put("amount", amountMap);
            }
            if (command.getReason() != null) {
                requestBody.put("note_to_payer", command.getReason());
            }

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/v2/payments/captures/" + command.getCaptureId() + "/refund",
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            String refundId = root.path("id").asText();
            String status = root.path("status").asText();

            log.info("PayPalSandbox: Refund processed successfully [refundId={}, status={}]", refundId, status);
            return PaymentRefundResult.success(refundId, status);

        } catch (HttpStatusCodeException e) {
            log.error("PayPalSandbox: Failed to refund capture [{}]. Status: [{}], Response: [{}]",
                    command.getCaptureId(), e.getStatusCode(), sanitizeError(e.getResponseBodyAsString()));
            return PaymentRefundResult.failure("PayPal refund failed: " + e.getStatusCode());
        } catch (Exception e) {
            log.error("PayPalSandbox: Unexpected error refunding capture [{}]: {}",
                    command.getCaptureId(), e.getMessage());
            return PaymentRefundResult.failure("PayPal refund error: " + e.getMessage());
        }
    }

    /**
     * Authenticates with PayPal Sandbox via OAuth 2.0 Client Credentials.
     * Caches access token with TTL safety margin.
     */
    public synchronized String getAccessToken() {
        Instant now = Instant.now();
        if (cachedAccessToken != null && now.isBefore(tokenExpiresAt)) {
            return cachedAccessToken;
        }

        String clientId = paymentProperties.getPaypal().getClientId();
        String clientSecret = paymentProperties.getPaypal().getClientSecret();
        if (clientId == null || clientId.isBlank() || clientSecret == null || clientSecret.isBlank()) {
            throw new IllegalStateException("PayPal Sandbox credentials are not configured. Check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.");
        }

        String baseUrl = resolveBaseUrl();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);
        String auth = clientId + ":" + clientSecret;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));
        headers.set("Authorization", "Basic " + encodedAuth);

        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "client_credentials");

        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    baseUrl + "/v1/oauth2/token",
                    HttpMethod.POST,
                    request,
                    String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            this.cachedAccessToken = root.path("access_token").asText();
            int expiresIn = root.path("expires_in").asInt(3600);
            // Expire 60 seconds early to avoid token expiration during flight
            this.tokenExpiresAt = now.plusSeconds(Math.max(60, expiresIn - 60));

            log.info("PayPalSandbox: Successfully acquired access token (expires in {}s)", expiresIn);
            return this.cachedAccessToken;
        } catch (Exception e) {
            log.error("PayPalSandbox: Failed to obtain access token from [{}/v1/oauth2/token]: {}", baseUrl, e.getMessage());
            throw new IllegalStateException("Unable to authenticate with PayPal Sandbox: " + e.getMessage(), e);
        }
    }

    private String resolveBaseUrl() {
        String url = paymentProperties.getPaypal().getBaseUrl();
        if (url == null || url.isBlank()) {
            return "https://api-m.sandbox.paypal.com";
        }
        // Strict guard against live domain
        if (url.contains("api-m.paypal.com") && !url.contains("sandbox")) {
            log.error("SECURITY ALERT: Attempted to use production PayPal URL! Enforcing sandbox.");
            return "https://api-m.sandbox.paypal.com";
        }
        return url;
    }

    private String sanitizeError(String raw) {
        if (raw == null) return null;
        return raw.replaceAll("(?i)(client_secret|access_token|secret)=\\w+", "$1=[REDACTED]");
    }
}
