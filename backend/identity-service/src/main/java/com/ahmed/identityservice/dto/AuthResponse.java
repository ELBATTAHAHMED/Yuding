package com.ahmed.identityservice.dto;

public record AuthResponse(
        String accessToken,
        String tokenType,
        long expiresIn,
        UserProfileResponse user
) {
    public static AuthResponse of(String accessToken, long expiresIn, UserProfileResponse user) {
        return new AuthResponse(accessToken, "Bearer", expiresIn, user);
    }
}
