package com.ahmed.notificationservice;

import com.ahmed.notificationservice.domain.provider.EmailMessage;
import com.ahmed.notificationservice.domain.provider.EmailSendResult;
import com.ahmed.notificationservice.domain.provider.smtp.SmtpEmailProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.profiles.active=test")
@ActiveProfiles("test")
public class SmtpIntegrationTest {

    @Autowired
    private SmtpEmailProvider smtpEmailProvider;

    @Test
    @DisplayName("Should successfully send email to local Mailpit SMTP server on port 1025")
    void shouldSendRealSmtpEmailToMailpit() {
        EmailMessage message = EmailMessage.builder()
                .recipientEmail("qa-traveler@yuding.local")
                .recipientName("Alice QA")
                .subject("Test SMTP Delivery - Yuding V2")
                .htmlBody("<h1>Bienvenue sur Yuding</h1><p>Test d'intégration Mailpit réussi.</p>")
                .textBody("Bienvenue sur Yuding - Test d'intégration Mailpit réussi.")
                .notificationReference("NTF-TEST0001")
                .build();

        EmailSendResult result = smtpEmailProvider.send(message);

        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProviderMessageId()).isNotNull();
        assertThat(result.getProviderMessageId()).contains("@yuding.local");
    }

    @Test
    @DisplayName("Should permanently reject malformed recipient with CR/LF or missing @ symbol")
    void shouldRejectMalformedRecipientHeader() {
        EmailMessage badMessage = EmailMessage.builder()
                .recipientEmail("malicious@victim.com\r\nBcc: spy@evil.com")
                .subject("Injection Test")
                .htmlBody("<p>Injection</p>")
                .notificationReference("NTF-BAD00001")
                .build();

        EmailSendResult result = smtpEmailProvider.send(badMessage);

        assertThat(result.isSuccess()).isFalse();
        assertThat(result.isRetryable()).isFalse();
        assertThat(result.getErrorCode()).isEqualTo("INVALID_RECIPIENT");
    }
}
