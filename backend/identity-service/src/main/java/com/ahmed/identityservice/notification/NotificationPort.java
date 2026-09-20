package com.ahmed.identityservice.notification;

public interface NotificationPort {
    void sendEmailVerification(String email, String token);
    void sendPasswordReset(String email, String token);
}
