package com.ahmed.identityservice.security;

/**
 * Utility for parsing User-Agent strings into privacy-conscious, human-readable device labels.
 */
public final class DeviceUtils {

    private DeviceUtils() {}

    public static String parseDeviceLabel(String userAgent, String deviceInfo) {
        if (deviceInfo != null && !deviceInfo.isBlank() && !"UNKNOWN".equalsIgnoreCase(deviceInfo)) {
            return deviceInfo.trim();
        }

        if (userAgent == null || userAgent.isBlank() || "UNKNOWN".equalsIgnoreCase(userAgent)) {
            return "Unknown Device";
        }

        String ua = userAgent.toLowerCase();

        // Browser determination
        String browser = "Browser";
        if (ua.contains("edg/")) {
            browser = "Edge";
        } else if (ua.contains("chrome/") && !ua.contains("edg/")) {
            browser = "Chrome";
        } else if (ua.contains("firefox/")) {
            browser = "Firefox";
        } else if (ua.contains("safari/") && !ua.contains("chrome/")) {
            browser = "Safari";
        } else if (ua.contains("postman")) {
            browser = "Postman";
        } else if (ua.contains("curl")) {
            browser = "cURL";
        }

        // OS determination
        String os = "Unknown OS";
        if (ua.contains("windows")) {
            os = "Windows";
        } else if (ua.contains("iphone")) {
            os = "iOS (iPhone)";
        } else if (ua.contains("ipad")) {
            os = "iOS (iPad)";
        } else if (ua.contains("android")) {
            os = "Android";
        } else if (ua.contains("macintosh") || ua.contains("mac os")) {
            os = "macOS";
        } else if (ua.contains("linux")) {
            os = "Linux";
        }

        return browser + " on " + os;
    }
}
