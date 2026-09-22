package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.dto.BookingPricingResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.*;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import com.ahmed.reservationservice.domain.service.BookingPricingReadinessPolicy;
import com.ahmed.reservationservice.domain.service.BookingPricingService;
import com.ahmed.reservationservice.domain.service.BookingReadinessPolicy;
import com.ahmed.reservationservice.domain.service.ServerPricingFactory;
import com.ahmed.reservationservice.domain.service.ServerPricingHashGenerator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingPricingServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private OfferSnapshotRepository offerSnapshotRepository;
    @Mock private OfferRevalidationRepository offerRevalidationRepository;
    @Mock private ServerPricingQuoteRepository serverPricingQuoteRepository;

    private BookingPricingService pricingService;

    private final UUID userUuid = UUID.randomUUID();
    private final UUID bookingUuid = UUID.randomUUID();
    private final UUID snapshotUuid = UUID.randomUUID();
    private final UUID revalUuid = UUID.randomUUID();
    private final String bookingRef = "YUD-A1B2C3D4";

    @BeforeEach
    void setUp() {
        ServerPricingHashGenerator hashGenerator = new ServerPricingHashGenerator();
        ServerPricingFactory factory = new ServerPricingFactory(hashGenerator);
        BookingReadinessPolicy readinessPolicy = new BookingReadinessPolicy();
        BookingPricingReadinessPolicy paymentPolicy = new BookingPricingReadinessPolicy();

        pricingService = new BookingPricingService(
                bookingRepository,
                offerSnapshotRepository,
                offerRevalidationRepository,
                serverPricingQuoteRepository,
                factory,
                readinessPolicy,
                paymentPolicy
        );
    }

    private Booking createBooking(ProductType productType, BookingStatus status) {
        return Booking.builder()
                .id(bookingUuid)
                .userId(userUuid)
                .productType(productType)
                .bookingReference(bookingRef)
                .status(status)
                .build();
    }

    private OfferSnapshot createSnapshot(ProductType productType, String provider, BigDecimal providerAmt, String providerCurr, Map<String, Object> details) {
        return OfferSnapshot.builder()
                .id(snapshotUuid)
                .productType(productType)
                .provider(provider)
                .providerOfferId("OFFER-101")
                .providerAmount(providerAmt)
                .providerCurrency(providerCurr)
                .selectedDetails(details != null ? details : Map.of())
                .snapshotExpiresAt(Instant.now().plusSeconds(600))
                .build();
    }

    private OfferRevalidation createRevalidation(
            String avail, String priceStatus,
            BigDecimal currentAmt, String currentCurr,
            Instant validUntil, Instant acceptedAt) {
        return OfferRevalidation.builder()
                .id(revalUuid)
                .bookingId(bookingUuid)
                .offerSnapshotId(snapshotUuid)
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus(avail)
                .priceStatus(priceStatus)
                .snapshotProviderAmount(new BigDecimal("100.00"))
                .snapshotProviderCurrency("EUR")
                .currentProviderAmount(currentAmt)
                .currentProviderCurrency(currentCurr)
                .validUntil(validUntil)
                .priceChangeAcceptedAt(acceptedAt)
                .build();
    }

    @Test
    @DisplayName("Flight pricing: Unchanged fresh price creates PRICED quote with provider-native money")
    void testFlightPricingSuccess() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.FLIGHT, "SCRAPPA", new BigDecimal("120.00"), "EUR", null);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "UNCHANGED", new BigDecimal("120.00"), "EUR", Instant.now().plusSeconds(300), null);

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));
        when(serverPricingQuoteRepository.findByRevalidationId(revalUuid)).thenReturn(Optional.empty());
        when(serverPricingQuoteRepository.save(any(ServerPricingQuote.class))).thenAnswer(i -> i.getArgument(0));

        BookingPricingResponseDto response = pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER"));

        assertThat(response).isNotNull();
        assertThat(response.getBookingReference()).isEqualTo(bookingRef);
        assertThat(response.getPricingStatus()).isEqualTo("PRICED");
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
        assertThat(response.getCurrency()).isEqualTo("EUR");
        assertThat(response.isBreakdownComplete()).isFalse();
        assertThat(response.isCanProceedToPayment()).isTrue();
    }

    @Test
    @DisplayName("Hotel pricing: Changed price with user acknowledgment uses CURRENT revalidated price")
    void testHotelChangedPriceAcknowledged() {
        Booking booking = createBooking(ProductType.HOTEL, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.HOTEL, "NUITEE", new BigDecimal("100.00"), "USD", null);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "CHANGED", new BigDecimal("115.00"), "USD", Instant.now().plusSeconds(300), Instant.now());
        reval.setProductType("HOTEL");
        reval.setProvider("NUITEE");

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));
        when(serverPricingQuoteRepository.findByRevalidationId(revalUuid)).thenReturn(Optional.empty());
        when(serverPricingQuoteRepository.save(any(ServerPricingQuote.class))).thenAnswer(i -> i.getArgument(0));

        BookingPricingResponseDto response = pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER"));

        assertThat(response.getPricingStatus()).isEqualTo("PRICED");
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("115.00")); // Uses CURRENT amount, NOT snapshot (100)
        assertThat(response.getCurrency()).isEqualTo("USD");
        assertThat(response.isCanProceedToPayment()).isTrue();
    }

    @Test
    @DisplayName("Changed price without acknowledgment is rejected with PRICE_CHANGE_ACKNOWLEDGEMENT_REQUIRED")
    void testChangedPriceUnacknowledgedRejected() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.FLIGHT, "SCRAPPA", new BigDecimal("100.00"), "EUR", null);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "CHANGED", new BigDecimal("125.00"), "EUR", Instant.now().plusSeconds(300), null);

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));

        assertThatThrownBy(() -> pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER")))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("PRICE_CHANGE_ACKNOWLEDGEMENT_REQUIRED");
    }

    @Test
    @DisplayName("Stale revalidation is rejected with REVALIDATION_REQUIRED")
    void testStaleRevalidationRejected() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.FLIGHT, "SCRAPPA", new BigDecimal("100.00"), "EUR", null);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "UNCHANGED", new BigDecimal("100.00"), "EUR", Instant.now().minusSeconds(10), null);

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));

        assertThatThrownBy(() -> pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER")))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("REVALIDATION_REQUIRED");
    }

    @Test
    @DisplayName("Unavailable offer cannot be priced")
    void testUnavailableOfferCannotPrice() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.FLIGHT, "SCRAPPA", new BigDecimal("100.00"), "EUR", null);
        OfferRevalidation reval = createRevalidation("UNAVAILABLE", "NOT_AVAILABLE", null, null, Instant.now().plusSeconds(300), null);

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));

        assertThatThrownBy(() -> pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER")))
                .isInstanceOf(BookingConflictException.class)
                .hasMessageContaining("CANNOT_PRICE_UNAVAILABLE");
    }

    @Test
    @DisplayName("Train with no fare: produces NOT_PRICED quote with null monetary totals (never fake 0 MAD)")
    void testTrainWithNoFare() {
        Booking booking = createBooking(ProductType.TRAIN, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.TRAIN, "ONCF", null, null, null);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "NOT_APPLICABLE", null, null, Instant.now().plusSeconds(300), null);
        reval.setProductType("TRAIN");
        reval.setProvider("ONCF");

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));
        when(serverPricingQuoteRepository.findByRevalidationId(revalUuid)).thenReturn(Optional.empty());
        when(serverPricingQuoteRepository.save(any(ServerPricingQuote.class))).thenAnswer(i -> i.getArgument(0));

        BookingPricingResponseDto response = pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER"));

        assertThat(response.getPricingStatus()).isIn("NOT_PRICED", "NOT_APPLICABLE");
        assertThat(response.getTotalAmount()).isNull();
        assertThat(response.getCurrency()).isNull();
        assertThat(response.isCanProceedToPayment()).isFalse(); // Cannot pay for unpriced train
    }

    @Test
    @DisplayName("Breakdown truthfulness: Reconciled breakdown marked complete; unreconciled remains null")
    void testBreakdownTruthfulness() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        Map<String, Object> reconciledDetails = Map.of(
                "baseAmount", new BigDecimal("100.00"),
                "taxAmount", new BigDecimal("15.00"),
                "feeAmount", new BigDecimal("5.00")
        );
        OfferSnapshot snapshot = createSnapshot(ProductType.FLIGHT, "SCRAPPA", new BigDecimal("120.00"), "EUR", reconciledDetails);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "UNCHANGED", new BigDecimal("120.00"), "EUR", Instant.now().plusSeconds(300), null);

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));
        when(serverPricingQuoteRepository.findByRevalidationId(revalUuid)).thenReturn(Optional.empty());
        when(serverPricingQuoteRepository.save(any(ServerPricingQuote.class))).thenAnswer(i -> i.getArgument(0));

        BookingPricingResponseDto response = pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER"));

        assertThat(response.isBreakdownComplete()).isTrue();
        assertThat(response.getBaseAmount()).isEqualByComparingTo(new BigDecimal("100.00"));
        assertThat(response.getTaxAmount()).isEqualByComparingTo(new BigDecimal("15.00"));
        assertThat(response.getFeeAmount()).isEqualByComparingTo(new BigDecimal("5.00"));
        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
    }

    @Test
    @DisplayName("Ownership check: User A cannot price User B's booking")
    void testOwnershipDenied() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        UUID otherUser = UUID.randomUUID();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> pricingService.createAuthoritativePricing(bookingRef, otherUser.toString(), List.of("ROLE_USER")))
                .isInstanceOf(BookingOwnershipException.class)
                .hasMessageContaining("Access denied");
    }

    @Test
    @DisplayName("Idempotency: Re-calling pricing on same revalidation reuses existing quote without duplicates")
    void testIdempotentPricingReuse() {
        Booking booking = createBooking(ProductType.FLIGHT, BookingStatus.DRAFT);
        OfferSnapshot snapshot = createSnapshot(ProductType.FLIGHT, "SCRAPPA", new BigDecimal("120.00"), "EUR", null);
        OfferRevalidation reval = createRevalidation("AVAILABLE", "UNCHANGED", new BigDecimal("120.00"), "EUR", Instant.now().plusSeconds(300), null);

        ServerPricingQuote existingQuote = ServerPricingQuote.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingUuid)
                .revalidationId(revalUuid)
                .pricingStatus(PricingStatus.PRICED)
                .totalAmount(new BigDecimal("120.00"))
                .currency("EUR")
                .validUntil(Instant.now().plusSeconds(300))
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingUuid)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingUuid)).thenReturn(Optional.of(reval));
        when(serverPricingQuoteRepository.findByRevalidationId(revalUuid)).thenReturn(Optional.of(existingQuote));

        BookingPricingResponseDto response = pricingService.createAuthoritativePricing(bookingRef, userUuid.toString(), List.of("ROLE_USER"));

        assertThat(response.getTotalAmount()).isEqualByComparingTo(new BigDecimal("120.00"));
        verify(serverPricingQuoteRepository, never()).save(any());
    }
}
