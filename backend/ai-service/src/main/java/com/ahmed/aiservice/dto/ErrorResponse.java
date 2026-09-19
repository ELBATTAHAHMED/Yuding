package com.ahmed.aiservice.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.Instant;
import java.util.List;

/**
 * Standardized, safe error response payload for AI Service.
 * Prevents leaking internal database structures, stack traces, or credentials in production.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        String requestId,
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        List<ValidationError> validationErrors
) {
    public record ValidationError(String field, String message) {}

    public static ErrorResponse of(String requestId, int status, String error, String message, String path) {
        return new ErrorResponse(requestId, Instant.now(), status, error, message, path, null);
    }

    public static ErrorResponse withValidationErrors(String requestId, int status, String error, String message, String path, List<ValidationError> errors) {
        return new ErrorResponse(requestId, Instant.now(), status, error, message, path, errors);
    }
}
