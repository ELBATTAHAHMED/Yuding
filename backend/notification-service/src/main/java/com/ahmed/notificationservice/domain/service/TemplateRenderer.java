package com.ahmed.notificationservice.domain.service;

import com.ahmed.notificationservice.domain.model.NotificationEventType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.thymeleaf.ITemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class TemplateRenderer {

    private final ITemplateEngine templateEngine;

    public String resolveSubject(NotificationEventType eventType, Map<String, Object> parameters) {
        String bookingRef = (String) parameters.getOrDefault("bookingReference", "");
        return switch (eventType) {
            case VERIFY_ACCOUNT -> "Vérification de votre compte Yuding";
            case RESET_PASSWORD -> "Réinitialisation de votre mot de passe Yuding";
            case PAYMENT_FAILED -> bookingRef.isBlank()
                    ? "Échec du paiement de votre réservation Yuding"
                    : "Échec du paiement pour votre réservation " + bookingRef;
            case BOOKING_CONFIRMED -> bookingRef.isBlank()
                    ? "Confirmation de votre réservation Yuding"
                    : "Confirmation de votre réservation " + bookingRef;
            case BOOKING_CANCELLED -> bookingRef.isBlank()
                    ? "Annulation de votre réservation Yuding"
                    : "Annulation de votre réservation " + bookingRef;
            case REFUND_COMPLETED -> bookingRef.isBlank()
                    ? "Remboursement de votre réservation Yuding"
                    : "Remboursement effectué pour votre réservation " + bookingRef;
        };
    }

    public String renderHtml(String templateName, Map<String, Object> parameters) {
        Context context = new Context();
        context.setVariables(parameters);
        return templateEngine.process("email/" + templateName + ".html", context);
    }

    public String renderText(String templateName, Map<String, Object> parameters) {
        Context context = new Context();
        context.setVariables(parameters);
        return templateEngine.process("email/" + templateName + ".txt", context);
    }
}
