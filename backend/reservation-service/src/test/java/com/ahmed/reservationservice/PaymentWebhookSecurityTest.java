package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.model.WebhookEvent;
import com.ahmed.reservationservice.domain.model.WebhookProcessingStatus;
import com.ahmed.reservationservice.domain.payment.webhook.PayPalWebhookSignatureVerifier;
import com.ahmed.reservationservice.domain.payment.webhook.PaymentWebhookService;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.repository.WebhookEventRepository;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.PaymentReferenceGenerator;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "yuding.payment.provider=paypal-sandbox",
        "yuding.payment.paypal.client-id=mock-client-id",
        "yuding.payment.paypal.client-secret=mock-client-secret",
        "yuding.payment.paypal.webhook-id=WH-MOCK-ID-12345"
})
@Transactional
@DisplayName("Payment Webhook Security & Reconciliation Tests (Phase 40)")
public class PaymentWebhookSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private BookingRepository bookingRepository;
    @Autowired private OfferSnapshotRepository offerSnapshotRepository;
    @Autowired private OfferRevalidationRepository offerRevalidationRepository;
    @Autowired private ServerPricingQuoteRepository serverPricingQuoteRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private WebhookEventRepository webhookEventRepository;
    @Autowired private BookingReferenceGenerator bookingRefGenerator;
    @Autowired private PaymentReferenceGenerator paymentRefGenerator;

    @MockBean private PayPalWebhookSignatureVerifier signatureVerifier;

    // Legacy mock beans
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private TransportsServices transportsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private UtilisateurFeign utilisateurFeign;

    private Booking testBooking;
    private Payment testPayment;
    private ServerPricingQuote testQuote;

    @BeforeEach
    void setUp() {
        UUID userId = UUID.randomUUID();
        testBooking = Booking.createDraft(userId, ProductType.FLIGHT, bookingRefGenerator.generate(), Instant.now(), null);
        testBooking = bookingRepository.save(testBooking);
        testBooking.transitionTo(BookingStatus.PENDING_PAYMENT, Instant.now());
        testBooking = bookingRepository.save(testBooking);

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(testBooking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("FLIGHT-OFFER-40")
                .selectedDetails(Map.of("carrier", "AT"))
                .providerAmount(new BigDecimal("192.00"))
                .providerCurrency("EUR")
                .snapshotExpiresAt(Instant.now().plusSeconds(600))
                .capturedAt(Instant.now())
                .snapshotHash("a".repeat(64))
                .build();
        snapshot = offerSnapshotRepository.save(snapshot);

        OfferRevalidation reval = OfferRevalidation.builder()
                .bookingId(testBooking.getId())
                .offerSnapshotId(snapshot.getId())
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .currentProviderAmount(new BigDecimal("192.00"))
                .currentProviderCurrency("EUR")
                .validUntil(Instant.now().plusSeconds(600))
                .build();
        reval = offerRevalidationRepository.save(reval);

        testQuote = ServerPricingQuote.builder()
                .bookingId(testBooking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(reval.getId())
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("192.00"))
                .currency("EUR")
                .validUntil(reval.getValidUntil())
                .pricingHash("b".repeat(64))
                .version(0)
                .build();
        testQuote = serverPricingQuoteRepository.save(testQuote);

        testPayment = Payment.builder()
                .bookingId(testBooking.getId())
                .paymentReference(paymentRefGenerator.generate())
                .pricingQuoteId(testQuote.getId())
                .providerName("paypal-sandbox")
                .providerOrderId("ORDER-TEST-40")
                .providerTransactionId("CAPTURE-TEST-40")
                .amount(new BigDecimal("192.00"))
                .currency("EUR")
                .status(PaymentStatus.AWAITING_WEBHOOK)
                .build();
        testPayment = paymentRepository.save(testPayment);
    }

    @Test
    @DisplayName("Endpoint Security: Rejects webhook missing PayPal signature headers with HTTP 400")
    void testRejectsMissingSignatureHeaders() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(false);

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"id\":\"WH-TEST-1\",\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        // Confirm no state mutation
        Payment unchangedPayment = paymentRepository.findById(testPayment.getId()).orElseThrow();
        assertThat(unchangedPayment.getStatus()).isEqualTo(PaymentStatus.AWAITING_WEBHOOK);
        Booking unchangedBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(unchangedBooking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("Endpoint Security: Forged webhook payload with invalid signature is rejected without state mutation")
    void testForgedWebhookPayloadRejected() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(false);

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-AUTH-ALGO", "SHA256withRSA")
                        .header("PAYPAL-CERT-URL", "https://api.sandbox.paypal.com/cert")
                        .header("PAYPAL-TRANSMISSION-ID", "FAKE-TRANS-1")
                        .header("PAYPAL-TRANSMISSION-SIG", "FAKESIG==")
                        .header("PAYPAL-TRANSMISSION-TIME", "2026-09-22T20:00:00Z")
                        .content("""
                        {
                          "id": "WH-FORGED-1",
                          "event_type": "PAYMENT.CAPTURE.COMPLETED",
                          "resource": {
                            "id": "CAPTURE-TEST-40",
                            "status": "COMPLETED",
                            "amount": { "value": "192.00", "currency_code": "EUR" }
                          }
                        }
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        // Must NOT transition to PAID
        Payment payment = paymentRepository.findById(testPayment.getId()).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.AWAITING_WEBHOOK);
        Booking booking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("Webhook Reconciliation: Valid PAYMENT.CAPTURE.COMPLETED transitions Payment to SUCCEEDED and Booking to PAID")
    void testValidCaptureCompletedTransitionsToPaid() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(true);

        String payload = """
                {
                  "id": "WH-VALID-1",
                  "event_type": "PAYMENT.CAPTURE.COMPLETED",
                  "resource": {
                    "id": "CAPTURE-TEST-40",
                    "status": "COMPLETED",
                    "amount": {
                      "value": "192.00",
                      "currency_code": "EUR"
                    },
                    "supplementary_data": {
                      "related_ids": {
                        "order_id": "ORDER-TEST-40"
                      }
                    }
                  }
                }
                """;

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-AUTH-ALGO", "SHA256withRSA")
                        .header("PAYPAL-CERT-URL", "https://api.sandbox.paypal.com/cert")
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-VALID-1")
                        .header("PAYPAL-TRANSMISSION-SIG", "VALIDSIG==")
                        .header("PAYPAL-TRANSMISSION-TIME", "2026-09-22T20:00:00Z")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.processingStatus").value("PROCESSED"));

        // Verify domain truth
        Payment updatedPayment = paymentRepository.findById(testPayment.getId()).orElseThrow();
        assertThat(updatedPayment.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);

        Booking updatedBooking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(updatedBooking.getStatus()).isEqualTo(BookingStatus.PAID);

        // Verify webhook event ledger
        assertThat(webhookEventRepository.existsByProviderAndProviderEventId("paypal-sandbox", "WH-VALID-1")).isTrue();
    }

    @Test
    @DisplayName("Event Deduplication: Replaying same verified event ID returns duplicate acknowledgement without double mutation")
    void testDuplicateWebhookEventDeduplication() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(true);

        String payload = """
                {
                  "id": "WH-DEDUP-1",
                  "event_type": "PAYMENT.CAPTURE.COMPLETED",
                  "resource": {
                    "id": "CAPTURE-TEST-40",
                    "status": "COMPLETED",
                    "amount": { "value": "192.00", "currency_code": "EUR" }
                  }
                }
                """;

        // First delivery: processes successfully
        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-1")
                        .header("PAYPAL-AUTH-ALGO", "RSA")
                        .header("PAYPAL-CERT-URL", "https://cert")
                        .header("PAYPAL-TRANSMISSION-SIG", "SIG")
                        .header("PAYPAL-TRANSMISSION-TIME", "TIME")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processingStatus").value("PROCESSED"));

        // Second delivery (replay): returns DUPLICATE status
        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-2")
                        .header("PAYPAL-AUTH-ALGO", "RSA")
                        .header("PAYPAL-CERT-URL", "https://cert")
                        .header("PAYPAL-TRANSMISSION-SIG", "SIG")
                        .header("PAYPAL-TRANSMISSION-TIME", "TIME")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processingStatus").value("DUPLICATE"));
    }

    @Test
    @DisplayName("Security: Amount mismatch prevents PAID transition and logs failure")
    void testAmountMismatchDoesNotMarkPaid() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(true);

        String payload = """
                {
                  "id": "WH-MISMATCH-1",
                  "event_type": "PAYMENT.CAPTURE.COMPLETED",
                  "resource": {
                    "id": "CAPTURE-TEST-40",
                    "status": "COMPLETED",
                    "amount": { "value": "1.00", "currency_code": "EUR" }
                  }
                }
                """;

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-MISMATCH")
                        .header("PAYPAL-AUTH-ALGO", "RSA")
                        .header("PAYPAL-CERT-URL", "https://cert")
                        .header("PAYPAL-TRANSMISSION-SIG", "SIG")
                        .header("PAYPAL-TRANSMISSION-TIME", "TIME")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processingStatus").value("FAILED"));

        // Booking MUST remain PENDING_PAYMENT
        Booking booking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);

        Payment payment = paymentRepository.findById(testPayment.getId()).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.AWAITING_WEBHOOK);
    }

    @Test
    @DisplayName("Security: Currency mismatch prevents PAID transition")
    void testCurrencyMismatchDoesNotMarkPaid() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(true);

        String payload = """
                {
                  "id": "WH-CURR-MISMATCH-1",
                  "event_type": "PAYMENT.CAPTURE.COMPLETED",
                  "resource": {
                    "id": "CAPTURE-TEST-40",
                    "status": "COMPLETED",
                    "amount": { "value": "192.00", "currency_code": "USD" }
                  }
                }
                """;

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-CURR")
                        .header("PAYPAL-AUTH-ALGO", "RSA")
                        .header("PAYPAL-CERT-URL", "https://cert")
                        .header("PAYPAL-TRANSMISSION-SIG", "SIG")
                        .header("PAYPAL-TRANSMISSION-TIME", "TIME")
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processingStatus").value("FAILED"));

        Booking booking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT);
    }

    @Test
    @DisplayName("Out-of-Order Safety: Stale PENDING or DENIED event cannot downgrade already COMPLETED payment")
    void testStaleEventCannotDowngradeCompletedPayment() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(true);

        // Mark payment and booking as already PAID
        testPayment.markSucceeded("CAPTURE-TEST-40", Instant.now());
        paymentRepository.save(testPayment);
        testBooking.transitionTo(BookingStatus.PAID, Instant.now());
        bookingRepository.save(testBooking);

        String stalePendingPayload = """
                {
                  "id": "WH-STALE-1",
                  "event_type": "PAYMENT.CAPTURE.PENDING",
                  "resource": {
                    "id": "CAPTURE-TEST-40",
                    "status": "PENDING",
                    "amount": { "value": "192.00", "currency_code": "EUR" }
                  }
                }
                """;

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-STALE")
                        .header("PAYPAL-AUTH-ALGO", "RSA")
                        .header("PAYPAL-CERT-URL", "https://cert")
                        .header("PAYPAL-TRANSMISSION-SIG", "SIG")
                        .header("PAYPAL-TRANSMISSION-TIME", "TIME")
                        .content(stalePendingPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processingStatus").value("IGNORED"));

        // Must remain SUCCEEDED and PAID
        Payment payment = paymentRepository.findById(testPayment.getId()).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);

        Booking booking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PAID);
    }

    @Test
    @DisplayName("Lifecycle: PAYMENT.CAPTURE.DENIED transitions Payment to FAILED and Booking to PAYMENT_FAILED")
    void testCaptureDeniedTransitionsToPaymentFailed() throws Exception {
        when(signatureVerifier.verifySignature(any(), any())).thenReturn(true);

        String deniedPayload = """
                {
                  "id": "WH-DENIED-1",
                  "event_type": "PAYMENT.CAPTURE.DENIED",
                  "resource": {
                    "id": "CAPTURE-TEST-40",
                    "status": "DENIED",
                    "amount": { "value": "192.00", "currency_code": "EUR" }
                  }
                }
                """;

        mockMvc.perform(post("/webhooks/paypal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .header("PAYPAL-TRANSMISSION-ID", "TRANS-DENIED")
                        .header("PAYPAL-AUTH-ALGO", "RSA")
                        .header("PAYPAL-CERT-URL", "https://cert")
                        .header("PAYPAL-TRANSMISSION-SIG", "SIG")
                        .header("PAYPAL-TRANSMISSION-TIME", "TIME")
                        .content(deniedPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.processingStatus").value("PROCESSED"));

        Payment payment = paymentRepository.findById(testPayment.getId()).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.FAILED);

        Booking booking = bookingRepository.findById(testBooking.getId()).orElseThrow();
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PAYMENT_FAILED);
    }
}
