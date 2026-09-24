package com.ahmed.aiservice.domain.util;

import java.security.SecureRandom;

public final class ReferenceGenerator {

    private static final String CROCKFORD_BASE32 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final SecureRandom RANDOM = new SecureRandom();

    private ReferenceGenerator() {}

    public static String generateTripReference() {
        return "TRP-" + randomString(8);
    }

    public static String generateAttachmentReference() {
        return "ATT-" + randomString(8);
    }

    private static String randomString(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            sb.append(CROCKFORD_BASE32.charAt(RANDOM.nextInt(CROCKFORD_BASE32.length())));
        }
        return sb.toString();
    }
}
