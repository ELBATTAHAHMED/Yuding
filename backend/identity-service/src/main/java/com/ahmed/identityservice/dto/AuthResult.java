package com.ahmed.identityservice.dto;

public record AuthResult(AuthResponse authResponse, String rawRefreshToken) {
}
