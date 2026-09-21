package com.ahmed.travelservice.provider;

public enum TravelProduct {
    FLIGHTS(ProviderCapability.FLIGHTS),
    HOTELS(ProviderCapability.HOTELS),
    ACTIVITIES(ProviderCapability.ACTIVITIES),
    TRANSFERS(ProviderCapability.TRANSFERS),
    TRAINS(ProviderCapability.TRAINS);

    private final ProviderCapability requiredCapability;

    TravelProduct(ProviderCapability requiredCapability) {
        this.requiredCapability = requiredCapability;
    }

    public ProviderCapability getRequiredCapability() {
        return requiredCapability;
    }

    public static TravelProduct fromString(String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Travel product cannot be null or blank");
        }
        return TravelProduct.valueOf(value.trim().toUpperCase());
    }
}
