package com.ahmed.travelservice.domain.enums;

public enum TravelClass {
    ECONOMY,
    PREMIUM_ECONOMY,
    BUSINESS,
    FIRST;

    public static TravelClass fromString(String value) {
        if (value == null || value.isBlank()) {
            return ECONOMY;
        }
        try {
            return TravelClass.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid travel class: " + value + ". Allowed: ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST");
        }
    }
}
