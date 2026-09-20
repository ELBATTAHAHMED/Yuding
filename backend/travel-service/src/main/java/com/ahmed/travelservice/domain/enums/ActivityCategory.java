package com.ahmed.travelservice.domain.enums;

public enum ActivityCategory {
    ALL,
    ADVENTURE,
    SPORTS,
    CULTURE,
    NATURE,
    GASTRONOMY,
    WELLNESS;

    public static ActivityCategory fromString(String value) {
        if (value == null || value.isBlank() || value.equalsIgnoreCase("ALL")) {
            return ALL;
        }
        String clean = value.trim().toUpperCase();
        for (ActivityCategory cat : values()) {
            if (cat.name().equalsIgnoreCase(clean) || clean.contains(cat.name())) {
                return cat;
            }
        }
        // Also support common French labels
        if (clean.contains("AVENTURE")) return ADVENTURE;
        if (clean.contains("SPORT")) return SPORTS;
        if (clean.contains("CULTURE")) return CULTURE;
        if (clean.contains("NATURE")) return NATURE;
        if (clean.contains("GASTRO") || clean.contains("CUISINE")) return GASTRONOMY;
        if (clean.contains("BIEN-ETRE") || clean.contains("SPA")) return WELLNESS;

        return ALL;
    }
}
