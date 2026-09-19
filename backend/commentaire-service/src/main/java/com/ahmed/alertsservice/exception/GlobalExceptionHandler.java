package com.ahmed.alertsservice.exception;

import com.ahmed.alertsservice.DTO.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

/**
 * Centralized exception handler for Commentaire Service.
 * Catches validation errors, authorization denials, and unexpected exceptions,
 * emitting sanitized responses tagged with a traceable requestId.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private String getOrGenerateRequestId(HttpServletRequest request) {
        String reqId = request.getHeader("X-Request-Id");
        if (reqId == null || reqId.isBlank()) {
            reqId = MDC.get("requestId");
        }
        if (reqId == null || reqId.isBlank()) {
            reqId = UUID.randomUUID().toString();
        }
        return reqId;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String requestId = getOrGenerateRequestId(request);
        List<ErrorResponse.ValidationError> errors = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> new ErrorResponse.ValidationError(err.getField(), err.getDefaultMessage()))
                .toList();

        log.warn("[{}] Validation failed on {}: {} field error(s)", requestId, request.getRequestURI(), errors.size());
        ErrorResponse response = ErrorResponse.withValidationErrors(
                requestId,
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                "Validation failed for one or more fields",
                request.getRequestURI(),
                errors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ErrorResponse> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest request) {
        String requestId = getOrGenerateRequestId(request);
        log.warn("[{}] Constraint violation on {}: {}", requestId, request.getRequestURI(), ex.getMessage());
        ErrorResponse response = ErrorResponse.of(
                requestId,
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDenied(AccessDeniedException ex, HttpServletRequest request) {
        String requestId = getOrGenerateRequestId(request);
        log.warn("[{}] Access denied on {}: {}", requestId, request.getRequestURI(), ex.getMessage());
        ErrorResponse response = ErrorResponse.of(
                requestId,
                HttpStatus.FORBIDDEN.value(),
                "Forbidden",
                "Access is denied. You do not have permission to perform this action.",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(ResponseStatusException ex, HttpServletRequest request) {
        String requestId = getOrGenerateRequestId(request);
        log.warn("[{}] Response status exception on {}: {}", requestId, request.getRequestURI(), ex.getReason());
        ErrorResponse response = ErrorResponse.of(
                requestId,
                ex.getStatusCode().value(),
                ex.getStatusCode().toString(),
                ex.getReason() != null ? ex.getReason() : "Request failed",
                request.getRequestURI()
        );
        return ResponseEntity.status(ex.getStatusCode()).body(response);
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ResponseEntity<ErrorResponse> handleNoResourceFound(org.springframework.web.servlet.resource.NoResourceFoundException ex, HttpServletRequest request) {
        String requestId = getOrGenerateRequestId(request);
        log.warn("[{}] Resource not found on {}: {}", requestId, request.getRequestURI(), ex.getMessage());
        ErrorResponse response = ErrorResponse.of(
                requestId,
                HttpStatus.NOT_FOUND.value(),
                "Not Found",
                "The requested resource was not found: " + request.getRequestURI(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String requestId = getOrGenerateRequestId(request);
        log.error("[{}] Unhandled internal exception on {}", requestId, request.getRequestURI(), ex);
        ErrorResponse response = ErrorResponse.of(
                requestId,
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "Internal Server Error",
                "An unexpected internal error occurred. Please contact support with request ID: " + requestId,
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
    }
}
