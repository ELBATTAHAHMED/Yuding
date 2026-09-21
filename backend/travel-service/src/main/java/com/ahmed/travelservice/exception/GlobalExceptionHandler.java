package com.ahmed.travelservice.exception;

import com.ahmed.travelservice.dto.response.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private String getRequestId(HttpServletRequest request) {
        String reqId = MDC.get("requestId");
        if (reqId != null && !reqId.isBlank()) {
            return reqId;
        }
        reqId = request.getHeader("X-Request-Id");
        if (reqId != null && !reqId.isBlank()) {
            return reqId;
        }
        return request.getHeader("X-Correlation-Id");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        List<ErrorResponse.ValidationError> errors = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.add(new ErrorResponse.ValidationError(fieldError.getField(), fieldError.getDefaultMessage()));
        }

        ErrorResponse errorResponse = ErrorResponse.withValidationErrors(
                reqId,
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_TRAVEL_SEARCH",
                "Travel search request failed validation",
                request.getRequestURI(),
                errors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(TravelValidationException.class)
    public ResponseEntity<ErrorResponse> handleTravelValidationException(TravelValidationException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        List<ErrorResponse.ValidationError> errors = null;
        if (ex.getField() != null) {
            errors = List.of(new ErrorResponse.ValidationError(ex.getField(), ex.getMessage()));
        }

        ErrorResponse errorResponse = ErrorResponse.withValidationErrors(
                reqId,
                HttpStatus.BAD_REQUEST.value(),
                ex.getErrorCode(),
                ex.getMessage(),
                request.getRequestURI(),
                errors
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        ErrorResponse errorResponse = ErrorResponse.of(
                reqId,
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_ARGUMENT",
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MissingServletRequestParameterException.class)
    public ResponseEntity<ErrorResponse> handleMissingRequestParameter(MissingServletRequestParameterException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        ErrorResponse errorResponse = ErrorResponse.withValidationErrors(
                reqId,
                HttpStatus.BAD_REQUEST.value(),
                "MISSING_REQUEST_PARAMETER",
                "Required request parameter '" + ex.getParameterName() + "' is missing",
                request.getRequestURI(),
                List.of(new ErrorResponse.ValidationError(ex.getParameterName(), "This parameter is required"))
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
    public ResponseEntity<ErrorResponse> handleRequestParameterTypeMismatch(MethodArgumentTypeMismatchException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        ErrorResponse errorResponse = ErrorResponse.withValidationErrors(
                reqId,
                HttpStatus.BAD_REQUEST.value(),
                "INVALID_REQUEST_PARAMETER",
                "Request parameter '" + ex.getName() + "' has an invalid value",
                request.getRequestURI(),
                List.of(new ErrorResponse.ValidationError(ex.getName(), "Invalid parameter value"))
        );
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ErrorResponse> handleAccessDeniedException(AccessDeniedException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        ErrorResponse errorResponse = ErrorResponse.of(
                reqId,
                HttpStatus.FORBIDDEN.value(),
                "FORBIDDEN",
                "Access is denied: insufficient role privileges",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(errorResponse);
    }

    @ExceptionHandler(com.ahmed.travelservice.provider.error.TravelProviderException.class)
    public ResponseEntity<ErrorResponse> handleTravelProviderException(com.ahmed.travelservice.provider.error.TravelProviderException ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        HttpStatus status = switch (ex.getErrorCode()) {
            case OFFER_NOT_FOUND -> HttpStatus.NOT_FOUND;
            case OFFER_EXPIRED -> HttpStatus.GONE;
            case PROVIDER_RATE_LIMITED -> HttpStatus.TOO_MANY_REQUESTS;
            case PROVIDER_AUTHENTICATION_FAILED -> HttpStatus.BAD_GATEWAY;
            case PROVIDER_TIMEOUT -> HttpStatus.GATEWAY_TIMEOUT;
            case CAPABILITY_NOT_SUPPORTED -> HttpStatus.NOT_IMPLEMENTED;
            case PROVIDER_QUOTA_EXHAUSTED -> HttpStatus.BAD_GATEWAY;
            case PROVIDER_REQUEST_INVALID -> HttpStatus.BAD_REQUEST;
            case SCHEDULE_DATA_OUTDATED -> HttpStatus.UNPROCESSABLE_ENTITY;
            case PROVIDER_UNAVAILABLE, PROVIDER_NOT_CONFIGURED -> HttpStatus.SERVICE_UNAVAILABLE;
            default -> HttpStatus.BAD_GATEWAY;
        };

        log.warn("TravelProviderException [id={}, provider={}, code={}]: {}",
                reqId, ex.getProviderCode(), ex.getErrorCode(), ex.getMessage());

        ErrorResponse errorResponse = ErrorResponse.of(
                reqId,
                status.value(),
                ex.getErrorCode().name(),
                ex.getMessage(),
                request.getRequestURI()
        );
        return ResponseEntity.status(status).body(errorResponse);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex, HttpServletRequest request) {
        String reqId = getRequestId(request);
        log.error("Unhandled exception processing request [id={}]", reqId, ex);

        ErrorResponse errorResponse = ErrorResponse.of(
                reqId,
                HttpStatus.INTERNAL_SERVER_ERROR.value(),
                "INTERNAL_SERVER_ERROR",
                "An unexpected internal error occurred while processing travel search",
                request.getRequestURI()
        );
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
    }
}
