package com.ahmed.alertsservice.controllers;

import com.ahmed.alertsservice.services.ReviewService;
import com.ahmed.alertsservice.services.ReviewService.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/apic/reviews")
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviews;
    public record MineResponse(Review review) { }

    @GetMapping("/public/{type}/{provider}/{reference}")
    public PublicReviews publicReviews(@PathVariable String type, @PathVariable String provider,
                                       @PathVariable String reference) {
        return reviews.publicReviews(type, provider, reference);
    }

    @GetMapping("/booking/{reference}/eligibility")
    public Eligibility eligibility(@PathVariable String reference, @AuthenticationPrincipal Jwt jwt) {
        return reviews.eligibility(reference, jwt);
    }

    @GetMapping("/booking/{reference}/mine")
    public MineResponse mine(@PathVariable String reference, @AuthenticationPrincipal Jwt jwt) {
        Eligibility target = reviews.eligibility(reference, jwt); // ownership is checked by booking-service
        return new MineResponse(reviews.mine(target.bookingId(), UUID.fromString(jwt.getSubject())));
    }

    @PostMapping("/booking/{reference}")
    public ResponseEntity<Review> create(@PathVariable String reference, @RequestBody ReviewInput input,
                                          @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reviews.create(reference, input, jwt));
    }

    @PutMapping("/{id}")
    public Review edit(@PathVariable UUID id, @RequestBody ReviewInput input, @AuthenticationPrincipal Jwt jwt) {
        return reviews.edit(id, input, jwt);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        reviews.delete(id, UUID.fromString(jwt.getSubject()));
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/moderation")
    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public List<Review> pending() { return reviews.pending(); }

    @PutMapping("/moderation/{id}/{decision}")
    @PreAuthorize("hasAnyRole('ADMIN','SUPPORT')")
    public ResponseEntity<Void> moderate(@PathVariable UUID id, @PathVariable String decision) {
        reviews.moderate(id, decision);
        return ResponseEntity.noContent().build();
    }
}
