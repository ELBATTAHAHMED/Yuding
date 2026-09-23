package com.ahmed.notificationservice.domain.provider;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmailSendResult {
    boolean success;
    String providerMessageId;
    boolean retryable;
    String errorCode;
    String errorMessage;

    public static EmailSendResult success(String providerMessageId) {
        return EmailSendResult.builder()
                .success(true)
                .providerMessageId(providerMessageId)
                .retryable(false)
                .build();
    }

    public static EmailSendResult transientFailure(String errorCode, String errorMessage) {
        return EmailSendResult.builder()
                .success(false)
                .retryable(true)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .build();
    }

    public static EmailSendResult permanentFailure(String errorCode, String errorMessage) {
        return EmailSendResult.builder()
                .success(false)
                .retryable(false)
                .errorCode(errorCode)
                .errorMessage(errorMessage)
                .build();
    }
}
