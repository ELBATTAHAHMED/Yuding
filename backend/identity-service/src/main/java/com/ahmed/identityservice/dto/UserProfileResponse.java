package com.ahmed.identityservice.dto;

import com.ahmed.identityservice.model.User;
import com.ahmed.identityservice.model.UserStatus;

import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public record UserProfileResponse(
        UUID id,
        String email,
        String firstName,
        String lastName,
        String phoneNumber,
        String countryCode,
        UserStatus status,
        boolean isEmailVerified,
        Set<String> roles,
        Instant createdAt
) {
    public static UserProfileResponse from(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(r -> r.getName())
                .collect(Collectors.toSet());

        return new UserProfileResponse(
                user.getId(),
                user.getEmail(),
                user.getFirstName(),
                user.getLastName(),
                user.getPhoneNumber(),
                user.getCountryCode(),
                user.getStatus(),
                user.isEmailVerified(),
                roleNames,
                user.getCreatedAt()
        );
    }
}
