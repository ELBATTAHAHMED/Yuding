package com.ahmed.identityservice.security;

import java.util.regex.Pattern;

/**
 * Utility for masking network and personal identifiers to preserve user privacy.
 */
public final class PrivacyUtils {

    private static final Pattern IPV4_PATTERN = Pattern.compile("^(\\d{1,3}\\.\\d{1,3}\\.\\d{1,3})\\.\\d{1,3}$");

    private PrivacyUtils() {}

    /**
     * Anonymizes an IP address for privacy-conscious storage and display.
     * E.g. 192.168.1.42 -> 192.168.1.***
     * E.g. 2001:0db8:85a3:0000:0000:8a2e:0370:7334 -> 2001:0db8:85a3:****
     */
    public static String maskIpAddress(String ip) {
        if (ip == null || ip.isBlank() || "UNKNOWN".equalsIgnoreCase(ip)) {
            return "UNKNOWN";
        }
        String clean = ip.trim();
        if ("127.0.0.1".equals(clean) || "0:0:0:0:0:0:0:1".equals(clean) || "::1".equals(clean)) {
            return "127.0.0.***";
        }

        var ipv4Matcher = IPV4_PATTERN.matcher(clean);
        if (ipv4Matcher.matches()) {
            return ipv4Matcher.group(1) + ".***";
        }

        // IPv6 masking
        if (clean.contains(":")) {
            String[] parts = clean.split(":");
            if (parts.length >= 3) {
                return parts[0] + ":" + parts[1] + ":" + parts[2] + ":****";
            }
            return clean.substring(0, Math.min(clean.length(), 10)) + ":****";
        }

        return "ANONYMIZED";
    }
}
