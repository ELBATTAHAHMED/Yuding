package com.ahmed.notificationservice.domain.model;

import java.security.SecureRandom;
import java.util.regex.Pattern;

public class NotificationReferenceGenerator {

    public static final String PREFIX = "NTF-";
    public static final int RANDOM_CHARS_LENGTH = 8;
    private static final String CROCKFORD_BASE32 = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final Pattern VALID_PATTERN = Pattern.compile("^NTF-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$");
    private static final SecureRandom RANDOM = new SecureRandom();

    public static String generate() {
        StringBuilder sb = new StringBuilder(PREFIX);
        for (int i = 0; i < RANDOM_CHARS_LENGTH; i++) {
            int index = RANDOM.nextInt(CROCKFORD_BASE32.length());
            sb.append(CROCKFORD_BASE32.charAt(index));
        }
        return sb.toString();
    }

    public static boolean isValid(String reference) {
        if (reference == null) {
            return false;
        }
        return VALID_PATTERN.matcher(reference.trim().toUpperCase()).matches();
    }

    public static String normalize(String reference) {
        if (reference == null) {
            return "";
        }
        return reference.trim().toUpperCase();
    }
}
