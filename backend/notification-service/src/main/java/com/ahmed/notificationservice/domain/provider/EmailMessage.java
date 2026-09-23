package com.ahmed.notificationservice.domain.provider;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class EmailMessage {
    String recipientEmail;
    String recipientName;
    String subject;
    String htmlBody;
    String textBody;
    String notificationReference;
}
