package com.ahmed.notificationservice;

import com.ahmed.notificationservice.domain.model.NotificationEventType;
import com.ahmed.notificationservice.domain.service.TemplateRenderer;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(properties = "spring.profiles.active=test")
@ActiveProfiles("test")
public class TemplateRenderingTest {

    @Autowired
    private TemplateRenderer templateRenderer;

    @Test
    @DisplayName("Should render VERIFY_ACCOUNT template with safe link and escape user input")
    void shouldRenderVerifyAccountTemplate() {
        Map<String, Object> params = new HashMap<>();
        params.put("recipientName", "<script>alert('xss')</script>Alice");
        params.put("verificationLink", "http://localhost:3000/verify-email?token=sec_tok_123");

        String subject = templateRenderer.resolveSubject(NotificationEventType.VERIFY_ACCOUNT, params);
        String html = templateRenderer.renderHtml("verify-account", params);
        String text = templateRenderer.renderText("verify-account", params);

        assertThat(subject).isEqualTo("Vérification de votre compte Yuding");
        assertThat(html).contains("Vérifier mon compte");
        assertThat(html).contains("24 heures");
        assertThat(html).contains("http://localhost:3000/verify-email?token=sec_tok_123");
        // Check XSS escaping
        assertThat(html).doesNotContain("<script>alert('xss')</script>");
        assertThat(html).contains("&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;Alice");

        assertThat(text).contains("Vérification de votre compte");
        assertThat(text).contains("http://localhost:3000/verify-email?token=sec_tok_123");
    }

    @Test
    @DisplayName("Should render RESET_PASSWORD template with safe 1-hour expiry notice")
    void shouldRenderResetPasswordTemplate() {
        Map<String, Object> params = new HashMap<>();
        params.put("recipientName", "Bob");
        params.put("resetLink", "http://localhost:3000/reset-password?token=rst_tok_456");

        String subject = templateRenderer.resolveSubject(NotificationEventType.RESET_PASSWORD, params);
        String html = templateRenderer.renderHtml("reset-password", params);
        String text = templateRenderer.renderText("reset-password", params);

        assertThat(subject).isEqualTo("Réinitialisation de votre mot de passe Yuding");
        assertThat(html).contains("Réinitialiser mon mot de passe");
        assertThat(html).contains("1 heure");
        assertThat(html).contains("http://localhost:3000/reset-password?token=rst_tok_456");
        assertThat(html).doesNotContain("password="); // No plaintext password

        assertThat(text).contains("Réinitialisation de votre mot de passe");
        assertThat(text).contains("1 heure");
    }

    @Test
    @DisplayName("Should render PAYMENT_FAILED template with reference and truthful non-debit notice")
    void shouldRenderPaymentFailedTemplate() {
        Map<String, Object> params = new HashMap<>();
        params.put("bookingReference", "YUD-FAIL1234");
        params.put("paymentReference", "PAY-FAIL9999");
        params.put("amount", "150.00");
        params.put("currency", "EUR");
        params.put("dossierLink", "http://localhost:3000/bookings/YUD-FAIL1234");

        String subject = templateRenderer.resolveSubject(NotificationEventType.PAYMENT_FAILED, params);
        String html = templateRenderer.renderHtml("payment-failed", params);
        String text = templateRenderer.renderText("payment-failed", params);

        assertThat(subject).contains("YUD-FAIL1234");
        assertThat(html).contains("Le paiement n'a pas pu être validé");
        assertThat(html).contains("YUD-FAIL1234");
        assertThat(html).contains("PAY-FAIL9999");
        assertThat(html).contains("150.00 EUR");
        assertThat(html).contains("Aucun montant n'a été prélevé");

        assertThat(text).contains("YUD-FAIL1234");
        assertThat(text).contains("Aucun montant n'a été débité");
    }

    @Test
    @DisplayName("Should render BOOKING_CONFIRMED template with booking reference and product details")
    void shouldRenderBookingConfirmedTemplate() {
        Map<String, Object> params = new HashMap<>();
        params.put("bookingReference", "YUD-CONF7777");
        params.put("serviceTitle", "Hôtel Atlas Marrakech");
        params.put("productType", "HOTEL");
        params.put("amount", "246.00");
        params.put("currency", "EUR");
        params.put("dossierLink", "http://localhost:3000/bookings/YUD-CONF7777");

        String subject = templateRenderer.resolveSubject(NotificationEventType.BOOKING_CONFIRMED, params);
        String html = templateRenderer.renderHtml("booking-confirmed", params);
        String text = templateRenderer.renderText("booking-confirmed", params);

        assertThat(subject).contains("YUD-CONF7777");
        assertThat(html).contains("RÉSERVATION CONFIRMÉE");
        assertThat(html).contains("Hôtel Atlas Marrakech");
        assertThat(html).contains("246.00 EUR");

        assertThat(text).contains("YUD-CONF7777");
        assertThat(text).contains("Hôtel Atlas Marrakech");
    }

    @Test
    @DisplayName("Should render BOOKING_CANCELLED template without false refund promises")
    void shouldRenderBookingCancelledTemplate() {
        Map<String, Object> params = new HashMap<>();
        params.put("bookingReference", "YUD-CANC3333");
        params.put("dossierLink", "http://localhost:3000/bookings/YUD-CANC3333");

        String subject = templateRenderer.resolveSubject(NotificationEventType.BOOKING_CANCELLED, params);
        String html = templateRenderer.renderHtml("booking-cancelled", params);
        String text = templateRenderer.renderText("booking-cancelled", params);

        assertThat(subject).contains("YUD-CANC3333");
        assertThat(html).contains("ANNULÉ");
        assertThat(html).contains("conditions tarifaires du fournisseur");

        assertThat(text).contains("YUD-CANC3333");
    }

    @Test
    @DisplayName("Should render REFUND_COMPLETED template with authoritative refund details")
    void shouldRenderRefundCompletedTemplate() {
        Map<String, Object> params = new HashMap<>();
        params.put("bookingReference", "YUD-REFU5555");
        params.put("paymentReference", "PAY-REFU8888");
        params.put("amount", "99.00");
        params.put("currency", "EUR");

        String subject = templateRenderer.resolveSubject(NotificationEventType.REFUND_COMPLETED, params);
        String html = templateRenderer.renderHtml("refund-completed", params);
        String text = templateRenderer.renderText("refund-completed", params);

        assertThat(subject).contains("YUD-REFU5555");
        assertThat(html).contains("REMBOURSEMENT EFFECTUÉ");
        assertThat(html).contains("YUD-REFU5555");
        assertThat(html).contains("PAY-REFU8888");
        assertThat(html).contains("99.00 EUR");

        assertThat(text).contains("YUD-REFU5555");
        assertThat(text).contains("99.00 EUR");
    }
}
