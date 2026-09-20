package com.ahmed.travelservice.exception;

import lombok.Getter;

@Getter
public class TravelValidationException extends RuntimeException {
    private final String errorCode;
    private final String field;

    public TravelValidationException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
        this.field = null;
    }

    public TravelValidationException(String errorCode, String field, String message) {
        super(message);
        this.errorCode = errorCode;
        this.field = field;
    }
}
