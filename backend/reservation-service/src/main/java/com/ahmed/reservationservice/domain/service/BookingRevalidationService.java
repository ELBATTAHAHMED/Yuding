package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.config.BookingRevalidationProperties;
import com.ahmed.reservationservice.domain.dto.BookingRevalidationResponseDto;
import com.ahmed.reservationservice.domain.dto.InternalRevalidateOfferRequest;
import com.ahmed.reservationservice.domain.dto.InternalRevalidationResultDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.feign.TravelOfferResolverClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingRevalidationService {

    private final BookingRepository bookingRepository;
    private final OfferSnapshotRepository offerSnapshotRepository;
    private final OfferRevalidationRepository offerRevalidationRepository;
    private final TravelOfferResolverClient travelOfferResolverClient;
    private final BookingRevalidationProperties revalidationProperties;
    private final BookingReadinessPolicy readinessPolicy;
    private final Clock clock = Clock.systemUTC();

    /**
     * Revalidates a booking's offer snapshot against live provider sources (bypassing search cache).
     */
    public BookingRevalidationResponseDto revalidateBooking(String bookingReference, String userId, List<String> roles) {
        log.info("BookingRevalidation: Initiating live revalidation for reference [{}] by user [{}]", bookingReference, userId);

        // 1. Load booking and enforce ownership
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        // 2. Validate booking status (must be DRAFT)
        if (booking.getStatus() != BookingStatus.DRAFT) {
            throw new BookingConflictException("Only DRAFT bookings can be revalidated. Current status: " + booking.getStatus());
        }

        // 3. Load immutable OfferSnapshot
        OfferSnapshot snapshot = offerSnapshotRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BookingConflictException("OFFER_SNAPSHOT_REQUIRED: Booking " + bookingReference + " has no offer snapshot attached"));

        // 4. Build trusted server-to-server request
        InternalRevalidateOfferRequest internalRequest = InternalRevalidateOfferRequest.builder()
                .productType(snapshot.getProductType().name())
                .provider(snapshot.getProvider())
                .providerOfferId(snapshot.getProviderOfferId())
                .snapshotProviderAmount(snapshot.getProviderAmount())
                .snapshotProviderCurrency(snapshot.getProviderCurrency())
                .selectedDetails(snapshot.getSelectedDetails())
                .providerExpiresAt(snapshot.getProviderExpiresAt())
                .build();

        // 5. Invoke live provider check via travel-service (search cache bypassed)
        InternalRevalidationResultDto result = travelOfferResolverClient.revalidateOffer(internalRequest);

        // 6. Calculate validity window
        Instant revalidatedAt = result.getRevalidatedAt() != null ? result.getRevalidatedAt() : Instant.now(clock);
        int ttlSeconds = revalidationProperties != null ? revalidationProperties.getTtlSeconds() : 300;
        Instant validUntil = revalidatedAt.plus(Duration.ofSeconds(ttlSeconds));
        if (result.getProviderExpiresAt() != null && result.getProviderExpiresAt().isBefore(validUntil)) {
            validUntil = result.getProviderExpiresAt();
        }

        // 7. Persist revalidation outcome
        OfferRevalidation revalidation = OfferRevalidation.builder()
                .bookingId(booking.getId())
                .offerSnapshotId(snapshot.getId())
                .provider(result.getProvider() != null ? result.getProvider() : snapshot.getProvider())
                .productType(snapshot.getProductType().name())
                .availabilityStatus(result.getAvailabilityStatus())
                .priceStatus(result.getPriceStatus())
                .snapshotProviderAmount(snapshot.getProviderAmount())
                .snapshotProviderCurrency(snapshot.getProviderCurrency())
                .currentProviderAmount(result.getCurrentProviderAmount())
                .currentProviderCurrency(result.getCurrentProviderCurrency())
                .providerOfferId(snapshot.getProviderOfferId())
                .matchedProviderOfferId(result.getMatchedProviderOfferId())
                .revalidatedAt(revalidatedAt)
                .validUntil(validUntil)
                .providerExpiresAt(result.getProviderExpiresAt())
                .version(0)
                .build();

        revalidation = offerRevalidationRepository.save(revalidation);
        log.info("BookingRevalidation: Saved revalidation [id={}] for reference [{}]: availability={}, price={}",
                revalidation.getId(), bookingReference, revalidation.getAvailabilityStatus(), revalidation.getPriceStatus());

        // 8. Determine readiness for Phase 37 pricing
        boolean canProceed = readinessPolicy.canProceedToServerPricing(booking, snapshot, revalidation);

        return BookingRevalidationResponseDto.fromDomain(bookingReference, revalidation, canProceed, result.getMessage());
    }

    /**
     * Explicitly acknowledges and accepts a changed price quote for the latest fresh revalidation.
     */
    @Transactional
    public BookingRevalidationResponseDto acceptPriceChange(String bookingReference, String userId, List<String> roles) {
        log.info("BookingRevalidation: Accepting price change for reference [{}] by user [{}]", bookingReference, userId);

        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        if (booking.getStatus() != BookingStatus.DRAFT) {
            throw new BookingConflictException("Only DRAFT bookings can accept price changes. Current status: " + booking.getStatus());
        }

        OfferSnapshot snapshot = offerSnapshotRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BookingConflictException("OFFER_SNAPSHOT_REQUIRED: Booking " + bookingReference + " has no offer snapshot attached"));

        OfferRevalidation latest = offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(booking.getId())
                .orElseThrow(() -> new BookingConflictException("No revalidation record found for booking " + bookingReference));

        Instant now = Instant.now(clock);
        if (latest.getValidUntil() == null || !now.isBefore(latest.getValidUntil())) {
            throw new BookingConflictException("Revalidation quote has expired. Revalidation required.");
        }

        if (!"AVAILABLE".equalsIgnoreCase(latest.getAvailabilityStatus())) {
            throw new BookingConflictException("Cannot accept price change on unavailable offer.");
        }

        if (!"CHANGED".equalsIgnoreCase(latest.getPriceStatus())) {
            throw new BookingConflictException("Price has not changed for this revalidation quote.");
        }

        latest.setPriceChangeAcceptedAt(now);
        latest = offerRevalidationRepository.save(latest);

        boolean canProceed = readinessPolicy.canProceedToServerPricing(booking, snapshot, latest);

        return BookingRevalidationResponseDto.fromDomain(bookingReference, latest, canProceed, "Price change acknowledged successfully.");
    }

    private void validateOwnershipOrAdmin(Booking booking, String userId, List<String> roles) {
        if (roles != null && (roles.contains("ROLE_ADMIN") || roles.contains("ROLE_SUPPORT"))) {
            return;
        }
        if (userId == null || booking.getUserId() == null || !booking.getUserId().toString().equals(userId)) {
            throw new BookingOwnershipException("Access denied: You do not have permission to access booking " + booking.getBookingReference());
        }
    }
}
