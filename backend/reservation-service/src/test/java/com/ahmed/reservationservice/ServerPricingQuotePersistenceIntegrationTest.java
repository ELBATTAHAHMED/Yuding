package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.service.BookingReferenceGenerator;
import com.ahmed.reservationservice.domain.service.ServerPricingHashGenerator;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
@Transactional
class ServerPricingQuotePersistenceIntegrationTest {

    @Autowired private BookingRepository bookingRepository;
    @Autowired private OfferSnapshotRepository offerSnapshotRepository;
    @Autowired private OfferRevalidationRepository offerRevalidationRepository;
    @Autowired private ServerPricingQuoteRepository serverPricingQuoteRepository;
    @Autowired private ServerPricingHashGenerator hashGenerator;
    @Autowired private BookingReferenceGenerator referenceGenerator;

    // Legacy mock beans
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private TransportsServices transportsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private UtilisateurFeign utilisateurFeign;

    @Test
    @DisplayName("Persistence: Successfully saves and retrieves ServerPricingQuote linked to Booking and Revalidation")
    void testSaveAndRetrieveQuote() {
        UUID userId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, referenceGenerator.generate(), Instant.now(), null);
        booking = bookingRepository.save(booking);

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(booking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("OFFER-INT-1")
                .selectedDetails(Map.of("flight", "AF123"))
                .providerAmount(new BigDecimal("200.00"))
                .providerCurrency("EUR")
                .snapshotExpiresAt(Instant.now().plusSeconds(600))
                .capturedAt(Instant.now())
                .snapshotHash("a".repeat(64))
                .build();
        snapshot = offerSnapshotRepository.save(snapshot);

        OfferRevalidation reval = OfferRevalidation.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .currentProviderAmount(new BigDecimal("200.00"))
                .currentProviderCurrency("EUR")
                .validUntil(Instant.now().plusSeconds(300))
                .build();
        reval = offerRevalidationRepository.save(reval);

        String hash = hashGenerator.generateHash(
                booking.getId(), snapshot.getId(), reval.getId(), "FLIGHT", "SCRAPPA",
                PricingStatus.PRICED, null, null, null, new BigDecimal("200.00"), "EUR", false, reval.getValidUntil());

        ServerPricingQuote quote = ServerPricingQuote.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(reval.getId())
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("200.00"))
                .currency("EUR")
                .breakdownComplete(false)
                .validUntil(reval.getValidUntil())
                .pricingHash(hash)
                .version(0)
                .build();

        ServerPricingQuote saved = serverPricingQuoteRepository.save(quote);
        assertThat(saved.getId()).isNotNull();

        Optional<ServerPricingQuote> fetched = serverPricingQuoteRepository.findTopByBookingIdOrderByPricedAtDesc(booking.getId());
        assertThat(fetched).isPresent();
        assertThat(fetched.get().getTotalAmount()).isEqualByComparingTo(new BigDecimal("200.00"));
        assertThat(fetched.get().getCurrency()).isEqualTo("EUR");
        assertThat(fetched.get().getPricingHash()).isEqualTo(hash);
    }

    @Test
    @DisplayName("Integrity: UNIQUE constraint on revalidation_id rejects duplicate quote for same revalidation")
    void testUniqueRevalidationIdConstraint() {
        UUID userId = UUID.randomUUID();
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, referenceGenerator.generate(), Instant.now(), null);
        booking = bookingRepository.save(booking);

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(booking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("OFFER-INT-2")
                .selectedDetails(Map.of("flight", "AF124"))
                .snapshotExpiresAt(Instant.now().plusSeconds(600))
                .capturedAt(Instant.now())
                .snapshotHash("b".repeat(64))
                .build();
        snapshot = offerSnapshotRepository.save(snapshot);

        OfferRevalidation reval = OfferRevalidation.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .currentProviderAmount(new BigDecimal("150.00"))
                .currentProviderCurrency("EUR")
                .validUntil(Instant.now().plusSeconds(300))
                .build();
        reval = offerRevalidationRepository.save(reval);

        ServerPricingQuote quote1 = ServerPricingQuote.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(reval.getId())
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("150.00"))
                .currency("EUR")
                .validUntil(reval.getValidUntil())
                .pricingHash("c".repeat(64))
                .version(0)
                .build();

        serverPricingQuoteRepository.saveAndFlush(quote1);

        ServerPricingQuote quote2 = ServerPricingQuote.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .revalidationId(reval.getId()) // Same revalidation_id!
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("150.00"))
                .currency("EUR")
                .validUntil(reval.getValidUntil())
                .pricingHash("d".repeat(64))
                .version(0)
                .build();

        assertThatThrownBy(() -> serverPricingQuoteRepository.saveAndFlush(quote2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
