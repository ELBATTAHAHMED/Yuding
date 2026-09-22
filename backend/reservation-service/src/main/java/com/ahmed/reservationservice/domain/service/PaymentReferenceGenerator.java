package com.ahmed.reservationservice.domain.service;

import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.regex.Pattern;

/**
 * Cryptographically secure public Payment Reference generator and validator for Yuding V2.
 * Produces references in the format PAY-XXXXXXXX using an unambiguous uppercase Base32 alphabet.
 */
@Component
public class PaymentReferenceGenerator {

    public static final String ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    public static final String PREFIX = "PAY-";
    public static final int SUFFIX_LENGTH = 8;
    public static final int TOTAL_LENGTH = PREFIX.length() + SUFFIX_LENGTH; // 12 characters

    private static final Pattern REFERENCE_PATTERN = Pattern.compile("^PAY-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$");

    private final SecureRandom secureRandom;

    public PaymentReferenceGenerator() {
        this.secureRandom = new SecureRandom();
    }

    public PaymentReferenceGenerator(SecureRandom secureRandom) {
        this.secureRandom = secureRandom != null ? secureRandom : new SecureRandom();
    }

    /**
     * Generates a cryptographically random, URL-safe payment reference string.
     * Example: "PAY-K7M4P2Q8"
     */
    public String generate() {
        StringBuilder sb = new StringBuilder(TOTAL_LENGTH);
        sb.append(PREFIX);

        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            int index = secureRandom.nextInt(ALPHABET.length());
            sb.append(ALPHABET.charAt(index));
        }

        return sb.toString();
    }

    /**
     * Validates whether a given string adheres to the canonical PAY-XXXXXXXX format and alphabet.
     */
    public static boolean isValid(String reference) {
        if (reference == null || reference.length() != TOTAL_LENGTH) {
            return false;
        }
        return REFERENCE_PATTERN.matcher(reference).matches();
    }

    /**
     * Normalizes a reference string (trims leading/trailing whitespace and converts to uppercase).
     */
    public static String normalize(String reference) {
        if (reference == null) {
            return null;
        }
        return reference.trim().toUpperCase();
    }
}
