package com.ahmed.aiservice.domain.planner.controller;

import com.ahmed.aiservice.config.SecurityUtils;
import com.ahmed.aiservice.domain.planner.dto.TripPlanDto;
import com.ahmed.aiservice.domain.planner.dto.TripPlanRequest;
import com.ahmed.aiservice.domain.planner.service.TripPlannerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping
@RequiredArgsConstructor
@Slf4j
public class TripPlanController {

    private final TripPlannerService tripPlannerService;

    @PostMapping(
            value = {"/api/ai/trip-plans", "/ai/trip-plans"},
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<TripPlanDto> createTripPlan(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody TripPlanRequest request) {

        UUID userId = resolveUserUuid(jwt);
        log.info("REST: Create trip plan requested by user {}: {} -> {}", userId, request.getOrigin(), request.getDestination());
        TripPlanDto dto = tripPlannerService.planTrip(request, userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    @GetMapping(
            value = {"/api/ai/trip-plans", "/ai/trip-plans"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<List<TripPlanDto>> getUserTripPlans(
            @AuthenticationPrincipal Jwt jwt) {

        UUID userId = resolveUserUuid(jwt);
        List<TripPlanDto> plans = tripPlannerService.getUserTripPlans(userId);
        return ResponseEntity.ok(plans);
    }

    @GetMapping(
            value = {"/api/ai/trip-plans/{ref}", "/ai/trip-plans/{ref}"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<TripPlanDto> getTripPlanByReference(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("ref") String ref) {

        UUID userId = resolveUserUuid(jwt);
        TripPlanDto dto = tripPlannerService.getTripPlanByReference(ref, userId);
        return ResponseEntity.ok(dto);
    }

    @PostMapping(
            value = {"/api/ai/trip-plans/{ref}/refresh", "/ai/trip-plans/{ref}/refresh"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<TripPlanDto> refreshTripPlan(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable("ref") String ref) {

        UUID userId = resolveUserUuid(jwt);
        log.info("REST: Refresh trip plan requested by user {} for ref {}", userId, ref);
        TripPlanDto dto = tripPlannerService.refreshTripPlan(ref, userId);
        return ResponseEntity.ok(dto);
    }

    private UUID resolveUserUuid(Jwt jwt) {
        UUID userId = SecurityUtils.extractUuid(jwt);
        if (userId == null) {
            userId = SecurityUtils.getCurrentUserUuid();
        }
        if (userId == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User authentication required");
        }
        return userId;
    }
}
