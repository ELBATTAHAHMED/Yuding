package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.config.SecurityUtils;
import com.ahmed.reservationservice.domain.model.Booking;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Service
@Slf4j
public class BookingNotificationDispatcher {

    private final RestClient restClient;
    private final String frontendBaseUrl;

    public BookingNotificationDispatcher(
            @Value("${yuding.notification.service-url:http://localhost:8085}") String serviceUrl,
            @Value("${yuding.notification.frontend-base-url:http://localhost:3000}") String frontendBaseUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(serviceUrl)
                .build();
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public void dispatchBookingConfirmed(Booking booking) {
        try {
            String email = resolveRecipientEmail(booking);
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "BOOKING_CONFIRMED");
            payload.put("channel", "EMAIL");
            payload.put("recipientEmail", email);
            payload.put("recipientUserId", booking.getUserId());
            payload.put("bookingReference", booking.getBookingReference());
            payload.put("idempotencyKey", "BOOKING_CONFIRMED:" + booking.getBookingReference());

            Map<String, Object> params = new HashMap<>();
            params.put("bookingReference", booking.getBookingReference());
            params.put("productType", booking.getProductType() != null ? booking.getProductType().name() : "VOYAGE");
            params.put("dossierLink", frontendBaseUrl + "/booking/confirmation?bookingReference=" + booking.getBookingReference());
            payload.put("parameters", params);

            sendEvent(payload, "BOOKING_CONFIRMED", booking.getBookingReference());
        } catch (Exception ex) {
            log.warn("Failed to dispatch BOOKING_CONFIRMED for booking [{}]: {}",
                    booking.getBookingReference(), ex.getMessage());
        }
    }

    public void dispatchBookingCancelled(Booking booking) {
        try {
            String email = resolveRecipientEmail(booking);
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "BOOKING_CANCELLED");
            payload.put("channel", "EMAIL");
            payload.put("recipientEmail", email);
            payload.put("recipientUserId", booking.getUserId());
            payload.put("bookingReference", booking.getBookingReference());
            payload.put("idempotencyKey", "BOOKING_CANCELLED:" + booking.getBookingReference());

            Map<String, Object> params = new HashMap<>();
            params.put("bookingReference", booking.getBookingReference());
            params.put("dossierLink", frontendBaseUrl + "/bookings");
            payload.put("parameters", params);

            sendEvent(payload, "BOOKING_CANCELLED", booking.getBookingReference());
        } catch (Exception ex) {
            log.warn("Failed to dispatch BOOKING_CANCELLED for booking [{}]: {}",
                    booking.getBookingReference(), ex.getMessage());
        }
    }

    public void dispatchPaymentFailed(Booking booking, String paymentReference, BigDecimal amount, String currency) {
        try {
            String email = resolveRecipientEmail(booking);
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "PAYMENT_FAILED");
            payload.put("channel", "EMAIL");
            payload.put("recipientEmail", email);
            payload.put("recipientUserId", booking.getUserId());
            payload.put("bookingReference", booking.getBookingReference());
            payload.put("paymentReference", paymentReference);
            payload.put("idempotencyKey", "PAYMENT_FAILED:" + booking.getBookingReference() + ":" + System.currentTimeMillis());

            Map<String, Object> params = new HashMap<>();
            params.put("bookingReference", booking.getBookingReference());
            if (paymentReference != null) {
                params.put("paymentReference", paymentReference);
            }
            if (amount != null) {
                params.put("amount", amount.toPlainString());
            }
            params.put("currency", currency != null ? currency : "EUR");
            params.put("dossierLink", frontendBaseUrl + "/booking?bookingReference=" + booking.getBookingReference());
            payload.put("parameters", params);

            sendEvent(payload, "PAYMENT_FAILED", booking.getBookingReference());
        } catch (Exception ex) {
            log.warn("Failed to dispatch PAYMENT_FAILED for booking [{}]: {}",
                    booking.getBookingReference(), ex.getMessage());
        }
    }

    public void dispatchRefundCompleted(Booking booking, String paymentReference, BigDecimal amount, String currency) {
        try {
            String email = resolveRecipientEmail(booking);
            Map<String, Object> payload = new HashMap<>();
            payload.put("eventType", "REFUND_COMPLETED");
            payload.put("channel", "EMAIL");
            payload.put("recipientEmail", email);
            payload.put("recipientUserId", booking.getUserId());
            payload.put("bookingReference", booking.getBookingReference());
            payload.put("paymentReference", paymentReference);
            payload.put("idempotencyKey", "REFUND_COMPLETED:" + booking.getBookingReference());

            Map<String, Object> params = new HashMap<>();
            params.put("bookingReference", booking.getBookingReference());
            if (paymentReference != null) {
                params.put("paymentReference", paymentReference);
            }
            if (amount != null) {
                params.put("amount", amount.toPlainString());
            }
            params.put("currency", currency != null ? currency : "EUR");
            payload.put("parameters", params);

            sendEvent(payload, "REFUND_COMPLETED", booking.getBookingReference());
        } catch (Exception ex) {
            log.warn("Failed to dispatch REFUND_COMPLETED for booking [{}]: {}",
                    booking.getBookingReference(), ex.getMessage());
        }
    }

    private void sendEvent(Map<String, Object> payload, String eventType, String bookingReference) {
        restClient.post()
                .uri("/internal/notifications/events")
                .contentType(MediaType.APPLICATION_JSON)
                .body(payload)
                .retrieve()
                .toBodilessEntity();
        log.info("BookingNotificationDispatcher: Dispatched {} for booking [{}]", eventType, bookingReference);
    }

    private String resolveRecipientEmail(Booking booking) {
        String email = SecurityUtils.getCurrentUserEmail();
        if (email != null && !email.isBlank()) {
            return email;
        }
        UUID userId = booking.getUserId();
        return "traveler-" + (userId != null ? userId.toString().substring(0, 8) : "guest") + "@yuding.local";
    }
}
