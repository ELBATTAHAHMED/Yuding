package com.ahmed.identityservice.notification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

@Component
public class LoggingNotificationAdapter implements NotificationPort {

    private static final Logger log = LoggerFactory.getLogger(LoggingNotificationAdapter.class);

    @Override
    public void sendEmailVerification(String email, String token) {
        log.info("[NotificationPort] Email verification dispatched for email={}", email);
        // Do not log raw token in production logs; safe notification abstraction
    }

    @Override
    public void sendPasswordReset(String email, String token) {
        log.info("[NotificationPort] Password reset dispatched for email={}", email);
        // Do not log raw token in production logs; safe notification abstraction
    }
}
