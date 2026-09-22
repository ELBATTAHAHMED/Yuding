package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
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
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.TestPropertySource;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false"
})
@Transactional
class OfferSnapshotPersistenceIntegrationTest {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private OfferSnapshotRepository offerSnapshotRepository;

    // Legacy mock beans to prevent application context startup failures in isolated tests
    @MockBean
    private ReservationServices reservationServices;

    @MockBean
    private ReservationRepository reservationRepository;

    @MockBean
    private HebergementsServices hebergementsServices;

    @MockBean
    private TransportsServices transportsServices;

    @MockBean
    private ActiviteesServices activiteesServices;

    @MockBean
    private UtilisateurFeign utilisateurFeign;

    @Test
    @DisplayName("Persist and reload OfferSnapshot: validates DB foreign key, JSONB details, BigDecimal scale, and hash")
    void persistAndReloadOfferSnapshot_success() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        Booking booking = Booking.createDraft(userId, ProductType.HOTEL, "YUD-K7M4P2Q8", now, now.plus(Duration.ofMinutes(30)));
        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        Map<String, Object> details = Map.of(
                "hotelName", "Mamounia Palace",
                "city", "Marrakech",
                "rooms", 1
        );

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .booking(savedBooking)
                .productType(ProductType.HOTEL)
                .provider("NUITEE")
                .providerOfferId("lp1897")
                .selectedDetails(details)
                .providerAmount(new BigDecimal("2500.50"))
                .providerCurrency("MAD")
                .displayAmount(new BigDecimal("230.00"))
                .displayCurrency("EUR")
                .exchangeRate(new BigDecimal("0.092000"))
                .exchangeRateDate(LocalDate.now())
                .exchangeRateProvider("FRANKFURTER")
                .snapshotExpiresAt(now.plus(Duration.ofMinutes(15)))
                .capturedAt(now)
                .snapshotHash("1234567890123456789012345678901234567890123456789012345678901234")
                .build();

        OfferSnapshot savedSnapshot = offerSnapshotRepository.saveAndFlush(snapshot);
        assertThat(savedSnapshot.getId()).isNotNull();

        // Reload from database
        OfferSnapshot reloaded = offerSnapshotRepository.findByBookingId(savedBooking.getId()).orElseThrow();
        assertThat(reloaded.getProvider()).isEqualTo("NUITEE");
        assertThat(reloaded.getProviderOfferId()).isEqualTo("lp1897");
        assertThat(reloaded.getProviderAmount()).isEqualByComparingTo("2500.50");
        assertThat(reloaded.getProviderCurrency()).isEqualTo("MAD");
        assertThat(reloaded.getDisplayAmount()).isEqualByComparingTo("230.00");
        assertThat(reloaded.getDisplayCurrency()).isEqualTo("EUR");
        assertThat(reloaded.getSelectedDetails()).containsEntry("hotelName", "Mamounia Palace");
        assertThat(reloaded.getSnapshotHash()).isEqualTo("1234567890123456789012345678901234567890123456789012345678901234");
    }

    @Test
    @DisplayName("Unique booking snapshot constraint: database rejects second snapshot for the same booking")
    void duplicateSnapshot_rejectedByDatabase() {
        UUID userId = UUID.randomUUID();
        Instant now = Instant.now();
        Booking booking = Booking.createDraft(userId, ProductType.FLIGHT, "YUD-DUPL2345", now, now.plus(Duration.ofMinutes(30)));
        Booking savedBooking = bookingRepository.saveAndFlush(booking);

        OfferSnapshot snapshot1 = OfferSnapshot.builder()
                .booking(savedBooking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("fl-1")
                .selectedDetails(Map.of("origin", "CMN"))
                .snapshotExpiresAt(now.plus(Duration.ofMinutes(15)))
                .capturedAt(now)
                .snapshotHash("1111111111111111111111111111111111111111111111111111111111111111")
                .build();
        offerSnapshotRepository.saveAndFlush(snapshot1);

        OfferSnapshot snapshot2 = OfferSnapshot.builder()
                .booking(savedBooking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerOfferId("fl-2")
                .selectedDetails(Map.of("origin", "RAK"))
                .snapshotExpiresAt(now.plus(Duration.ofMinutes(15)))
                .capturedAt(now)
                .snapshotHash("2222222222222222222222222222222222222222222222222222222222222222")
                .build();

        assertThatThrownBy(() -> offerSnapshotRepository.saveAndFlush(snapshot2))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
