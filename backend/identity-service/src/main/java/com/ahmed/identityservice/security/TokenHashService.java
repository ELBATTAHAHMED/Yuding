package com.ahmed.identityservice.security;

import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;

@Service
public class TokenHashService {

    private final SecureRandom secureRandom = new SecureRandom();

    public String generateSecureToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    public String generateNumericCode(int digits) {
        if (digits < 4 || digits > 9) {
            throw new IllegalArgumentException("Verification code length must be between 4 and 9 digits");
        }
        int lowerBound = (int) Math.pow(10, digits - 1);
        int upperBound = (int) Math.pow(10, digits);
        return String.valueOf(lowerBound + secureRandom.nextInt(upperBound - lowerBound));
    }

    public String hashToken(String token) {
        if (token == null) {
            return null;
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }
}
