package com.ahmed.notificationservice.domain.dto;

import com.ahmed.notificationservice.domain.model.NotificationEventType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationEventRequest {

    @NotNull(message = "eventType is required")
    private NotificationEventType eventType;

    @NotBlank(message = "idempotencyKey is required")
    private String idempotencyKey;

    @NotBlank(message = "recipientEmail is required")
    @Email(message = "recipientEmail must be a valid email address")
    private String recipientEmail;

    private String recipientName;

    private UUID recipientUserId;

    private String bookingReference;

    private String paymentReference;

    private Map<String, Object> parameters;
}
