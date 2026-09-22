package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.Payment;
import com.ahmed.reservationservice.domain.model.PaymentStatus;
import com.ahmed.reservationservice.domain.model.PricingStatus;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.PaymentRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.PaymentReferenceGenerator;
import com.ahmed.reservationservice.feigh.UtilisateurFeign;
import com.ahmed.reservationservice.repositories.ReservationRepository;
import com.ahmed.reservationservice.services.ActiviteesServices;
import com.ahmed.reservationservice.services.HebergementsServices;
import com.ahmed.reservationservice.services.ReservationServices;
import com.ahmed.reservationservice.services.TransportsServices;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
@Transactional
@DisplayName("Payment Persistence Integration Tests (PostgreSQL payment.payments)")
class PaymentPersistenceIntegrationTest {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private OfferSnapshotRepository offerSnapshotRepository;
    @Autowired private OfferRevalidationRepository offerRevalidationRepository;
    @Autowired private ServerPricingQuoteRepository serverPricingQuoteRepository;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private BookingReferenceGenerator bookingRefGenerator;
    @Autowired private PaymentReferenceGenerator paymentRefGenerator;

    // Legacy mock beans
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private TransportsServices transportsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private UtilisateurFeign utilisateurFeign;

    @Test
    @DisplayName("Persistence: Successfully saves and retrieves Payment linked to Booking and PricingQuote")
    void testSaveAndRetrievePayment() {
        UUID userId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, bookingRefGenerator.generate(), Instant.now(), null);
        booking = bookingRepository.save(booking);

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(booking)
                .productType(ProductType.HOTEL)
                .provider("NUITEE")
                .providerOfferId("OFFER-PAY-1")
                .selectedDetails(Map.of("hotel", "Hilton"))
                .providerAmount(new BigDecimal("180.00"))
                .providerCurrency("EUR")
                .snapshotExpiresAt(Instant.now().plusSeconds(600))
                .capturedAt(Instant.now())
                .snapshotHash("e".repeat(64))
                .build();
        snapshot = offerSnapshotRepository.save(snapshot);

        OfferRevalidation reval = OfferRevalidation.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .provider("NUITEE")
                .productType("HOTEL")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .currentProviderAmount(new BigDecimal("180.00"))
                .currentProviderCurrency("EUR")
                .validUntil(Instant.now().plusSeconds(300))
                .build();
        reval = offerRevalidationRepository.save(reval);

        ServerPricingQuote quote = ServerPricingQuote.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(reval.getId())
                .productType("HOTEL")
                .provider("NUITEE")
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("180.00"))
                .currency("EUR")
                .validUntil(reval.getValidUntil())
                .pricingHash("f".repeat(64))
                .version(0)
                .build();
        quote = serverPricingQuoteRepository.save(quote);

        String paymentRef = paymentRefGenerator.generate();
        Payment payment = Payment.builder()
                .bookingId(booking.getId())
                .paymentReference(paymentRef)
                .pricingQuoteId(quote.getId())
                .providerName("paypal-sandbox")
                .providerOrderId("5O190127TN364715T")
                .amount(quote.getTotalAmount())
                .currency(quote.getCurrency())
                .status(PaymentStatus.INITIATED)
                .approvalUrl("https://www.sandbox.paypal.com/checkoutnow?token=5O190127TN364715T")
                .build();

        Payment saved = paymentRepository.save(payment);
        assertThat(saved.getId()).isNotNull();

        Optional<Payment> fetched = paymentRepository.findByPaymentReference(paymentRef);
        assertThat(fetched).isPresent();
        assertThat(fetched.get().getBookingId()).isEqualTo(booking.getId());
        assertThat(fetched.get().getAmount()).isEqualByComparingTo(new BigDecimal("180.00"));
        assertThat(fetched.get().getCurrency()).isEqualTo("EUR");
        assertThat(fetched.get().getProviderName()).isEqualTo("paypal-sandbox");
        assertThat(fetched.get().getProviderOrderId()).isEqualTo("5O190127TN364715T");

        // Test transition to SUCCEEDED
        saved.markSucceeded("2C679124TG364715T", Instant.now());
        Payment updated = paymentRepository.save(saved);
        assertThat(updated.getStatus()).isEqualTo(PaymentStatus.SUCCEEDED);
        assertThat(updated.getProviderTransactionId()).isEqualTo("2C679124TG364715T");
    }
}
