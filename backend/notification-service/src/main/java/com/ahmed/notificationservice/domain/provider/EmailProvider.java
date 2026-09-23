package com.ahmed.notificationservice.domain.provider;

public interface EmailProvider {

    String getProviderName();

    EmailSendResult send(EmailMessage message);
}
