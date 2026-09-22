package com.ahmed.reservationservice;

import com.ahmed.reservationservice.domain.config.BookingRevalidationProperties;
import com.ahmed.reservationservice.domain.dto.BookingRevalidationResponseDto;
import com.ahmed.reservationservice.domain.dto.InternalRevalidationResultDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ProductType;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.service.BookingReadinessPolicy;
import com.ahmed.reservationservice.domain.service.BookingRevalidationService;
import com.ahmed.reservationservice.feign.TravelOfferResolverClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingRevalidationServiceTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private OfferSnapshotRepository offerSnapshotRepository;

    @Mock
    private OfferRevalidationRepository offerRevalidationRepository;

    @Mock
    private TravelOfferResolverClient travelOfferResolverClient;

    private BookingRevalidationProperties revalidationProperties;
    private BookingReadinessPolicy readinessPolicy;
    private BookingRevalidationService service;

    private final UUID bookingId = UUID.randomUUID();
    private final UUID userUuid = UUID.randomUUID();
    private final String userId = userUuid.toString();
    private final String bookingRef = "YUD-K7M4P2Q8";

    @BeforeEach
    void setUp() {
        revalidationProperties = new BookingRevalidationProperties();
        revalidationProperties.setTtlSeconds(300);
        readinessPolicy = new BookingReadinessPolicy();

        service = new BookingRevalidationService(
                bookingRepository,
                offerSnapshotRepository,
                offerRevalidationRepository,
                travelOfferResolverClient,
                revalidationProperties,
                readinessPolicy
        );
    }

    @Test
    @DisplayName("Successful revalidation flow from snapshot to persisted OfferRevalidation")
    void testSuccessfulRevalidation() {
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingReference(bookingRef)
                .userId(userUuid)
                .status(BookingStatus.DRAFT)
                .build();

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .id(UUID.randomUUID())
                .booking(booking)
                .provider("SCRAPPA")
                .providerOfferId("scrappa-101")
                .productType(ProductType.FLIGHT)
                .providerAmount(new BigDecimal("150.00"))
                .providerCurrency("EUR")
                .build();

        InternalRevalidationResultDto resultDto = InternalRevalidationResultDto.builder()
                .productType("FLIGHT")
                .provider("SCRAPPA")
                .providerOfferId("scrappa-101")
                .matchedProviderOfferId("scrappa-101")
                .availabilityStatus("AVAILABLE")
                .priceStatus("UNCHANGED")
                .currentProviderAmount(new BigDecimal("150.00"))
                .currentProviderCurrency("EUR")
                .revalidatedAt(Instant.now())
                .validUntil(Instant.now().plusSeconds(300))
                .message("Revalidation passed")
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingId)).thenReturn(Optional.of(snapshot));
        when(travelOfferResolverClient.revalidateOffer(any())).thenReturn(resultDto);
        when(offerRevalidationRepository.save(any(OfferRevalidation.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingRevalidationResponseDto response = service.revalidateBooking(bookingRef, userId, List.of("ROLE_USER"));

        assertNotNull(response);
        assertEquals(bookingRef, response.getBookingReference());
        assertEquals("AVAILABLE", response.getAvailabilityStatus());
        assertEquals("UNCHANGED", response.getPriceStatus());
        assertTrue(response.isCanProceedToPricing());
        assertFalse(response.isRequiresPriceConfirmation());
        verify(offerRevalidationRepository, times(1)).save(any(OfferRevalidation.class));
    }

    @Test
    @DisplayName("Missing offer snapshot throws BookingConflictException (OFFER_SNAPSHOT_REQUIRED)")
    void testMissingSnapshotThrowsConflict() {
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingReference(bookingRef)
                .userId(userUuid)
                .status(BookingStatus.DRAFT)
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingId)).thenReturn(Optional.empty());

        BookingConflictException ex = assertThrows(
                BookingConflictException.class,
                () -> service.revalidateBooking(bookingRef, userId, List.of("ROLE_USER"))
        );
        assertTrue(ex.getMessage().contains("OFFER_SNAPSHOT_REQUIRED"));
    }

    @Test
    @DisplayName("Non-DRAFT booking rejects revalidation with BookingConflictException")
    void testNonDraftRejectsRevalidation() {
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingReference(bookingRef)
                .userId(userUuid)
                .status(BookingStatus.CONFIRMED)
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));

        assertThrows(
                BookingConflictException.class,
                () -> service.revalidateBooking(bookingRef, userId, List.of("ROLE_USER"))
        );
    }

    @Test
    @DisplayName("Unauthorized user rejects revalidation with BookingOwnershipException")
    void testUnauthorizedUserRejection() {
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingReference(bookingRef)
                .userId(userUuid)
                .status(BookingStatus.DRAFT)
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));

        String otherUserId = UUID.randomUUID().toString();
        assertThrows(
                BookingOwnershipException.class,
                () -> service.revalidateBooking(bookingRef, otherUserId, List.of("ROLE_USER"))
        );
    }

    @Test
    @DisplayName("Accept price change sets priceChangeAcceptedAt on fresh CHANGED quote")
    void testAcceptPriceChangeSuccess() {
        Booking booking = Booking.builder()
                .id(bookingId)
                .bookingReference(bookingRef)
                .userId(userUuid)
                .status(BookingStatus.DRAFT)
                .build();

        OfferSnapshot snapshot = OfferSnapshot.builder()
                .id(UUID.randomUUID())
                .booking(booking)
                .productType(ProductType.FLIGHT)
                .provider("SCRAPPA")
                .providerAmount(new BigDecimal("150.00"))
                .providerCurrency("EUR")
                .build();

        OfferRevalidation latestReval = OfferRevalidation.builder()
                .id(UUID.randomUUID())
                .bookingId(bookingId)
                .provider("SCRAPPA")
                .productType("FLIGHT")
                .availabilityStatus("AVAILABLE")
                .priceStatus("CHANGED")
                .snapshotProviderAmount(new BigDecimal("150.00"))
                .snapshotProviderCurrency("EUR")
                .currentProviderAmount(new BigDecimal("175.00"))
                .currentProviderCurrency("EUR")
                .revalidatedAt(Instant.now().minusSeconds(10))
                .validUntil(Instant.now().plusSeconds(290))
                .priceChangeAcceptedAt(null)
                .version(0)
                .build();

        when(bookingRepository.findByBookingReference(bookingRef)).thenReturn(Optional.of(booking));
        when(offerSnapshotRepository.findByBookingId(bookingId)).thenReturn(Optional.of(snapshot));
        when(offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(bookingId)).thenReturn(Optional.of(latestReval));
        when(offerRevalidationRepository.save(any(OfferRevalidation.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingRevalidationResponseDto response = service.acceptPriceChange(bookingRef, userId, List.of("ROLE_USER"));

        assertTrue(response.isPriceChangeAccepted());
        assertFalse(response.isRequiresPriceConfirmation());
        assertTrue(response.isCanProceedToPricing());
        assertNotNull(latestReval.getPriceChangeAcceptedAt());
    }
}
