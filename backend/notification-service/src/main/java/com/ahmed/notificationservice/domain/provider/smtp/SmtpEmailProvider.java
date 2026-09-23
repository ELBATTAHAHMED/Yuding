package com.ahmed.notificationservice.domain.provider.smtp;

import com.ahmed.notificationservice.config.NotificationProperties;
import com.ahmed.notificationservice.domain.provider.EmailMessage;
import com.ahmed.notificationservice.domain.provider.EmailProvider;
import com.ahmed.notificationservice.domain.provider.EmailSendResult;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class SmtpEmailProvider implements EmailProvider {

    private static final Logger log = LoggerFactory.getLogger(SmtpEmailProvider.class);

    private final JavaMailSender mailSender;
    private final NotificationProperties properties;

    @Override
    public String getProviderName() {
        return "smtp";
    }

    @Override
    public EmailSendResult send(EmailMessage message) {
        String recipient = message.getRecipientEmail();

        // 1. Defense against header injection & malformed recipient
        if (recipient == null || recipient.contains("\r") || recipient.contains("\n") || !recipient.contains("@")) {
            log.warn("SmtpEmailProvider: Permanent rejection - invalid recipient [{}]", recipient);
            return EmailSendResult.permanentFailure("INVALID_RECIPIENT", "Recipient address is invalid or contains CR/LF characters");
        }

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());

            InternetAddress from = new InternetAddress(properties.getFromAddress(), properties.getFromName(), StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(recipient);
            helper.setSubject(message.getSubject());

            String textBody = message.getTextBody() != null ? message.getTextBody() : "";
            String htmlBody = message.getHtmlBody() != null ? message.getHtmlBody() : textBody;

            // Multipart alternative: text/plain + text/html
            helper.setText(textBody, htmlBody);

            String messageId = "<" + UUID.randomUUID() + "@yuding.local>";
            mimeMessage.setHeader("Message-ID", messageId);
            mimeMessage.setHeader("X-Yuding-Reference", message.getNotificationReference());

            log.info("SmtpEmailProvider: Sending email [{}] to [{}] via SMTP host",
                    message.getNotificationReference(), maskEmail(recipient));

            mailSender.send(mimeMessage);

            log.info("SmtpEmailProvider: Successfully dispatched [{}] messageId={}",
                    message.getNotificationReference(), messageId);
            return EmailSendResult.success(messageId);

        } catch (MailAuthenticationException e) {
            log.error("SmtpEmailProvider: Authentication failure dispatching [{}]: {}",
                    message.getNotificationReference(), e.getMessage());
            return EmailSendResult.permanentFailure("SMTP_AUTH_FAILED", e.getMessage());

        } catch (MailSendException e) {
            log.warn("SmtpEmailProvider: Transient MailSendException dispatching [{}]: {}",
                    message.getNotificationReference(), e.getMessage());
            return EmailSendResult.transientFailure("SMTP_SEND_FAILED", e.getMessage());

        } catch (Exception e) {
            log.warn("SmtpEmailProvider: Temporary transmission error dispatching [{}]: {}",
                    message.getNotificationReference(), e.getMessage());
            return EmailSendResult.transientFailure("SMTP_TRANSMISSION_ERROR", e.getMessage());
        }
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) return "***";
        int atIdx = email.indexOf('@');
        String prefix = email.substring(0, Math.min(2, atIdx));
        return prefix + "***" + email.substring(atIdx);
    }
}
