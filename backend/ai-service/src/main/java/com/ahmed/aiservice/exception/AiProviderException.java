package com.ahmed.aiservice.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class AiProviderException extends RuntimeException {

    private final String errorCode;
    private final boolean retryable;
    private final HttpStatus httpStatus;

    public AiProviderException(String message, String errorCode, boolean retryable, HttpStatus httpStatus) {
        super(message);
        this.errorCode = errorCode;
        this.retryable = retryable;
        this.httpStatus = httpStatus != null ? httpStatus : HttpStatus.INTERNAL_SERVER_ERROR;
    }

    public AiProviderException(String message, String errorCode, boolean retryable, HttpStatus httpStatus, Throwable cause) {
        super(message, cause);
        this.errorCode = errorCode;
        this.retryable = retryable;
        this.httpStatus = httpStatus != null ? httpStatus : HttpStatus.INTERNAL_SERVER_ERROR;
    }

    public boolean isTransientError() {
        return isRetryable();
    }
}
