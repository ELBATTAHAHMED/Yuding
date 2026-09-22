package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
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
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
@Transactional
class OfferRevalidationPersistenceIntegrationTest {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private OfferSnapshotRepository offerSnapshotRepository;

    @Autowired
    private OfferRevalidationRepository offerRevalidationRepository;

    // Legacy mock beans
    @MockBean private ReservationServices reservationServices;
    @MockBean private ReservationRepository reservationRepository;
    @MockBean private HebergementsServices hebergementsServices;
    @MockBean private TransportsServices transportsServices;
    @MockBean private ActiviteesServices activiteesServices;
    @MockBean private UtilisateurFeign utilisateurFeign;

    @Test
    @DisplayName("Persist and reload OfferRevalidation record with foreign keys and timestamp ordering")
    void persistAndReloadOfferRevalidation_success() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, "YUD-K7M4P2Q8", now, now.plus(Duration.ofMinutes(30)));
        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(savedBooking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("fl-reval-1")
                .selectedDetails(Map.of("origin", "CDG", "destination", "CMN"))
                .providerAmount(new BigDecimal("150.00"))
                .providerCurrency("EUR")
                .snapshotExpiresAt(now.plus(Duration.ofMinutes(15)))
                .capturedAt(now)
                .snapshotHash("1111222233334444555566667777888899990000aaaabbbbccccddddeeeeffff")
                .build();
        OfferSnapshot savedSnapshot = offerSnapshotRepository.saveAndFlush(snapshot);

        OfferRevalidation reval = OfferRevalidation.builder()
                .bookingId(savedBooking.getId())
                .offerSnapshotId(savedSnapshot.getId())
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .snapshotProviderAmount(new BigDecimal("150.00"))
                .snapshotProviderCurrency("EUR")
                .currentProviderAmount(new BigDecimal("150.00"))
                .currentProviderCurrency("EUR")
                .providerOfferId("fl-reval-1")
                .matchedProviderOfferId("fl-reval-1")
                .revalidatedAt(now)
                .validUntil(now.plus(Duration.ofMinutes(5)))
                .version(0)
                .build();

        OfferRevalidation savedReval = offerRevalidationRepository.saveAndFlush(reval);
        assertThat(savedReval.getId()).isNotNull();

        OfferRevalidation reloaded = offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(savedBooking.getId()).orElseThrow();
        assertThat(reloaded.getProvider()).isEqualTo("SCRAPPA");
        assertThat(reloaded.getAvailabilityStatus()).isEqualTo("AVAILABLE");
        assertThat(reloaded.getPriceStatus()).isEqualTo("UNCHANGED");
        assertThat(reloaded.getCurrentProviderAmount()).isEqualByComparingTo("150.00");
        assertThat(reloaded.getCurrentProviderCurrency()).isEqualTo("EUR");
    }
}
