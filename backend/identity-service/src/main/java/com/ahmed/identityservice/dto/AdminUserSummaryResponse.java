package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.Role;
import com.ahmed.identityservice.model.User;
import com.ahmed.identityservice.model.UserStatus;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record AdminUserSummaryResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        String countryCode,
        UserStatus status,
        boolean isEmailVerified,
        int failedLoginAttempts,
        Instant lockedUntil,
        Instant lastLoginAt,
        Set<String> roles,
        Instant createdAt,
        Instant updatedAt
) {
    public static AdminUserSummaryResponse from(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        return new AdminUserSummaryResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.getCountryCode(),
                user.getStatus(),
                user.isEmailVerified(),
                user.getFailedLoginAttempts(),
                user.getLockedUntil(),
                user.getLastLoginAt(),
                roleNames,
                user.getCreatedAt(),
                user.getUpdatedAt()
        );
    }
}
