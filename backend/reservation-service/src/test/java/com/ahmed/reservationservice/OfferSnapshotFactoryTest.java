package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.ResolvedOfferDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.service.OfferSnapshotFactory;
import com.ahmed.reservationservice.domain.service.OfferSnapshotHashGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OfferSnapshotFactoryTest {

    private OfferSnapshotFactory factory;
    private final Instant fixedNow = Instant.parse("2026-10-01T10:00:00Z");

    @BeforeEach
    void setUp() {
        factory = new OfferSnapshotFactory(new OfferSnapshotHashGenerator());
    }

    private Booking createSampleBooking(ProductType productType) {
        return Booking.createDraft(
                UUID.randomUUID(),
                productType,
                "YUD-K7M4P2Q8",
                fixedNow,
                fixedNow.plus(Duration.ofMinutes(30))
        );
    }

    @Test
    @DisplayName("Flight offer snapshot mapping: preserves route, airline, price, conversion, and provider hash")
    void createSnapshot_flightOffer_success() {
        Booking booking = createSampleBooking(ProductType.FLIGHT);
        ResolvedOfferDto resolved = ResolvedOfferDto.builder()
                .selectionRef("sel-flight-1")
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("fl-scrappa-999")
                .selectedDetails(Map.of(
                        "origin", "CMN",
                        "destination", "CDG",
                        "airlineName", "Royal Air Maroc",
                        "flightNumber", "703",
                        "stops", 0,
                        "cabinClass", "ECONOMY"
                ))
                .providerAmount(new BigDecimal("350.00"))
                .providerCurrency("EUR")
                .displayAmount(new BigDecimal("3850.00"))
                .displayCurrency("MAD")
                .exchangeRate(new BigDecimal("11.000000"))
                .exchangeRateDate(LocalDate.of(2026, 10, 1))
                .exchangeRateProvider("FRANKFURTER")
                .providerExpiresAt(fixedNow.plus(Duration.ofMinutes(20)))
                .build();

        OfferSnapshot snapshot = factory.createSnapshot(booking, resolved, fixedNow);

        assertThat(snapshot.getBooking()).isEqualTo(booking);
        assertThat(snapshot.getProductType()).isEqualTo(ProductType.FLIGHT);
        assertThat(snapshot.getProvider()).isEqualTo("SCRAPPA");
        assertThat(snapshot.getProviderOfferId()).isEqualTo("fl-scrappa-999");
        assertThat(snapshot.getProviderAmount()).isEqualByComparingTo("350.00");
        assertThat(snapshot.getProviderCurrency()).isEqualTo("EUR");
        assertThat(snapshot.getDisplayAmount()).isEqualByComparingTo("3850.00");
        assertThat(snapshot.getDisplayCurrency()).isEqualTo("MAD");
        assertThat(snapshot.getExchangeRate()).isEqualByComparingTo("11.000000");
        assertThat(snapshot.getSelectedDetails()).containsEntry("origin", "CMN").containsEntry("airlineName", "Royal Air Maroc");
        assertThat(snapshot.getSnapshotHash()).isNotNull().hasSize(64);
        assertThat(snapshot.getCapturedAt()).isEqualTo(fixedNow);
    }

    @Test
    @DisplayName("Hotel offer snapshot mapping: preserves hotel identity, stay dates, room, and price")
    void createSnapshot_hotelOffer_success() {
        Booking booking = createSampleBooking(ProductType.HOTEL);
        ResolvedOfferDto resolved = ResolvedOfferDto.builder()
                .selectionRef("sel-hotel-1")
                .productType("HOTEL")
                .provider("NUITEE")
                .providerOfferId("lp1897")
                .selectedDetails(Map.of(
                        "hotelName", "Riad Marrakech",
                        "city", "Marrakech",
                        "checkIn", "2026-10-10",
                        "checkOut", "2026-10-15"
                ))
                .providerAmount(new BigDecimal("1200.00"))
                .providerCurrency("EUR")
                .build();

        OfferSnapshot snapshot = factory.createSnapshot(booking, resolved, fixedNow);

        assertThat(snapshot.getProductType()).isEqualTo(ProductType.HOTEL);
        assertThat(snapshot.getProvider()).isEqualTo("NUITEE");
        assertThat(snapshot.getProviderOfferId()).isEqualTo("lp1897");
        assertThat(snapshot.getProviderAmount()).isEqualByComparingTo("1200.00");
        assertThat(snapshot.getSnapshotExpiresAt()).isEqualTo(fixedNow.plus(Duration.ofMinutes(15))); // default fallback
    }

    @Test
    @DisplayName("Train offer with null price: preserves price-null and does not fabricate amount")
    void createSnapshot_trainOffer_nullPrice_preserved() {
        Booking booking = createSampleBooking(ProductType.TRAIN);
        ResolvedOfferDto resolved = ResolvedOfferDto.builder()
                .selectionRef("sel-train-1")
                .productType("TRAIN")
                .provider("ONCF_GTFS")
                .providerOfferId("train-trip-0700")
                .selectedDetails(Map.of("originStation", "Casablanca Voyageurs", "destinationStation", "Marrakech"))
                .providerAmount(null)
                .providerCurrency(null)
                .build();

        OfferSnapshot snapshot = factory.createSnapshot(booking, resolved, fixedNow);

        assertThat(snapshot.getProductType()).isEqualTo(ProductType.TRAIN);
        assertThat(snapshot.getProviderAmount()).isNull();
        assertThat(snapshot.getProviderCurrency()).isNull();
        assertThat(snapshot.getSnapshotHash()).isNotNull().hasSize(64);
    }

    @Test
    @DisplayName("Product type mismatch: throws BookingConflictException when booking type differs from offer type")
    void createSnapshot_productTypeMismatch_throwsConflict() {
        Booking booking = createSampleBooking(ProductType.HOTEL);
        ResolvedOfferDto resolved = ResolvedOfferDto.builder()
                .selectionRef("sel-flight-1")
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("fl-1")
                .build();

        assertThatThrownBy(() -> factory.createSnapshot(booking, resolved, fixedNow))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("Product type mismatch");
    }
}
