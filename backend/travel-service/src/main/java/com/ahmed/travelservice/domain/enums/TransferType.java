package com.ahmed.travelservice.domain.enums;

public enum TransferType {
    TAXI,
    TRAIN,
    CAR_RENTAL,
    PRIVATE,
    SHUTTLE;

    public static TransferType fromString(String value) {
        if (value == null || value.isBlank()) {
            return TAXI;
        }
        try {
            return TransferType.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid transfer type: " + value + ". Allowed: TAXI, TRAIN, CAR_RENTAL, PRIVATE, SHUTTLE");
        }
    }
}
