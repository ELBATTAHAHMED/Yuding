package com.ahmed.travelservice.provider.impl.hbx;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

/**
 * Utility for generating the official HBX / Hotelbeds X-Signature authentication header.
 *
 * Formula:
 * X-Signature = Hex(SHA-256(apiKey + secret + timestampInSeconds))
 */
public final class HBXAuthUtils {

    private HBXAuthUtils() {
    }

    /**
     * Generates an X-Signature using the current epoch timestamp in seconds.
     */
    public static String generateSignature(String apiKey, String secret) {
        return generateSignature(apiKey, secret, System.currentTimeMillis() / 1000L);
    }

    /**
     * Generates an X-Signature for a specific epoch timestamp in seconds.
     */
    public static String generateSignature(String apiKey, String secret, long timestampSeconds) {
        if (apiKey == null || secret == null) {
            throw new IllegalArgumentException("API key and secret must not be null for HBX signature generation.");
        }

        String input = apiKey + secret + timestampSeconds;
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}
