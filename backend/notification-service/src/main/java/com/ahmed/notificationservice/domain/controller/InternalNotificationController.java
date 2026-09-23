package com.ahmed.notificationservice.domain.controller;

import com.ahmed.notificationservice.domain.dto.NotificationEventRequest;
import com.ahmed.notificationservice.domain.dto.NotificationResponse;
import com.ahmed.notificationservice.domain.service.NotificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal/notifications")
@RequiredArgsConstructor
public class InternalNotificationController {

    private final NotificationService notificationService;

    @PostMapping("/events")
    public ResponseEntity<NotificationResponse> submitEvent(
            @Valid @RequestBody NotificationEventRequest request) {
        NotificationResponse response = notificationService.recordEvent(request);
        HttpStatus status = response.isDuplicateReplayed() ? HttpStatus.OK : HttpStatus.CREATED;
        return ResponseEntity.status(status).body(response);
    }

    @GetMapping("/{reference}")
    public ResponseEntity<NotificationResponse> getNotification(
            @PathVariable("reference") String reference) {
        return notificationService.getNotificationByReference(reference)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
