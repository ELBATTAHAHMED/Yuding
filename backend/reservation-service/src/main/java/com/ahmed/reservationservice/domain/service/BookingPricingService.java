package com.ahmed.reservationservice.domain.service;

import com.ahmed.reservationservice.domain.dto.BookingPricingResponseDto;
import com.ahmed.reservationservice.domain.exception.BookingConflictException;
import com.ahmed.reservationservice.domain.exception.BookingNotFoundException;
import com.ahmed.reservationservice.domain.exception.BookingOwnershipException;
import com.ahmed.reservationservice.domain.model.Booking;
import com.ahmed.reservationservice.domain.model.BookingStatus;
import com.ahmed.reservationservice.domain.model.OfferRevalidation;
import com.ahmed.reservationservice.domain.model.OfferSnapshot;
import com.ahmed.reservationservice.domain.model.ServerPricingQuote;
import com.ahmed.reservationservice.domain.repository.BookingRepository;
import com.ahmed.reservationservice.domain.repository.OfferRevalidationRepository;
import com.ahmed.reservationservice.domain.repository.OfferSnapshotRepository;
import com.ahmed.reservationservice.domain.repository.ServerPricingQuoteRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

/**
 * Authoritative business service for generating, validating, and retrieving server-side pricing quotes.
 * Guarantees zero client influence over monetary prices, totals, currencies, fees, or taxes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class BookingPricingService {

    private final BookingRepository bookingRepository;
    private final OfferSnapshotRepository offerSnapshotRepository;
    private final OfferRevalidationRepository offerRevalidationRepository;
    private final ServerPricingQuoteRepository serverPricingQuoteRepository;
    private final ServerPricingFactory pricingFactory;
    private final BookingReadinessPolicy bookingReadinessPolicy;
    private final BookingPricingReadinessPolicy paymentReadinessPolicy;
    private final Clock clock = Clock.systemUTC();

    /**
     * Generates a server-authoritative pricing quote for a Booking from trusted backend state.
     */
    @Transactional
    public BookingPricingResponseDto createAuthoritativePricing(String bookingReference, String userId, List<String> roles) {
        log.info("BookingPricing: Initiating authoritative pricing for reference [{}] by user [{}]", bookingReference, userId);

        // 1. Load booking and enforce ownership
        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        // 2. Validate booking status (must be DRAFT)
        if (booking.getStatus() != BookingStatus.DRAFT) {
            throw new BookingConflictException("Only DRAFT bookings can be priced. Current status: " + booking.getStatus());
        }

        // 3. Load immutable OfferSnapshot
        OfferSnapshot snapshot = offerSnapshotRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new BookingConflictException("OFFER_SNAPSHOT_REQUIRED: Booking " + bookingReference + " has no offer snapshot attached"));

        // 4. Load latest OfferRevalidation
        OfferRevalidation latestRevalidation = offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(booking.getId())
                .orElseThrow(() -> new BookingConflictException("REVALIDATION_REQUIRED: No live revalidation found for booking " + bookingReference));

        // 5. Enforce Phase 36 readiness rules
        Instant now = Instant.now(clock);
        if (latestRevalidation.getValidUntil() == null || !now.isBefore(latestRevalidation.getValidUntil())) {
            throw new BookingConflictException("REVALIDATION_REQUIRED: Revalidation quote has expired. Revalidation required.");
        }

        if (!"AVAILABLE".equalsIgnoreCase(latestRevalidation.getAvailabilityStatus())) {
            throw new BookingConflictException("CANNOT_PRICE_UNAVAILABLE: Offer availability is " + latestRevalidation.getAvailabilityStatus());
        }

        String priceStatus = latestRevalidation.getPriceStatus();
        if ("CHANGED".equalsIgnoreCase(priceStatus) && latestRevalidation.getPriceChangeAcceptedAt() == null) {
            throw new BookingConflictException("PRICE_CHANGE_ACKNOWLEDGEMENT_REQUIRED: Price changed from "
                    + latestRevalidation.getSnapshotProviderAmount() + " to " + latestRevalidation.getCurrentProviderAmount()
                    + ". User must acknowledge price change before pricing.");
        }

        if (!bookingReadinessPolicy.canProceedToServerPricing(booking, snapshot, latestRevalidation)) {
            throw new BookingConflictException("BOOKING_NOT_READY_FOR_PRICING: Booking does not satisfy revalidation readiness policy.");
        }

        // 6. Check for existing quote bound to this exact revalidation (idempotency / duplicate prevention)
        Optional<ServerPricingQuote> existing = serverPricingQuoteRepository.findByRevalidationId(latestRevalidation.getId());
        ServerPricingQuote quote;
        if (existing.isPresent()) {
            quote = existing.get();
            log.info("BookingPricing: Reusing existing pricing quote [id={}] for revalidation [{}]",
                    quote.getId(), latestRevalidation.getId());
        } else {
            // 7. Assemble immutable pricing quote from trusted server state
            quote = pricingFactory.createPricingQuote(booking, snapshot, latestRevalidation, now);
            try {
                quote = serverPricingQuoteRepository.save(quote);
                log.info("BookingPricing: Created and persisted server pricing quote [id={}, status={}, total={}, currency={}] for reference [{}]",
                        quote.getId(), quote.getPricingStatus(), quote.getTotalAmount(), quote.getCurrency(), bookingReference);
            } catch (DataIntegrityViolationException e) {
                // In case of concurrent creation for same revalidation_id, fetch winner
                log.warn("BookingPricing: Concurrent pricing creation detected for revalidation [{}]", latestRevalidation.getId());
                quote = serverPricingQuoteRepository.findByRevalidationId(latestRevalidation.getId())
                        .orElseThrow(() -> e);
            }
        }

        // 8. Evaluate readiness for Phase 38 Payment Preparation
        boolean canProceedToPayment = paymentReadinessPolicy.canProceedToPaymentPreparation(booking, quote, latestRevalidation);

        String message = quote.getPricingStatus() == com.ahmed.reservationservice.domain.model.PricingStatus.PRICED
                ? "Server-authoritative pricing established successfully."
                : "Product is not priced with a monetary fare.";

        return BookingPricingResponseDto.fromDomain(bookingReference, quote, canProceedToPayment, message);
    }

    /**
     * Retrieves the latest authoritative pricing quote for a Booking.
     */
    @Transactional(readOnly = true)
    public BookingPricingResponseDto getLatestPricing(String bookingReference, String userId, List<String> roles) {
        log.info("BookingPricing: Fetching latest pricing quote for reference [{}] by user [{}]", bookingReference, userId);

        Booking booking = bookingRepository.findByBookingReference(bookingReference)
                .orElseThrow(() -> new BookingNotFoundException(bookingReference));
        validateOwnershipOrAdmin(booking, userId, roles);

        Optional<ServerPricingQuote> latestQuoteOpt = serverPricingQuoteRepository.findTopByBookingIdOrderByPricedAtDesc(booking.getId());
        if (latestQuoteOpt.isEmpty()) {
            throw new BookingNotFoundException("No server pricing quote found for booking " + bookingReference);
        }

        ServerPricingQuote latestQuote = latestQuoteOpt.get();
        Optional<OfferRevalidation> latestRevalOpt = offerRevalidationRepository.findTopByBookingIdOrderByRevalidatedAtDesc(booking.getId());

        boolean canProceedToPayment = latestRevalOpt.isPresent()
                && paymentReadinessPolicy.canProceedToPaymentPreparation(booking, latestQuote, latestRevalOpt.get());

        return BookingPricingResponseDto.fromDomain(bookingReference, latestQuote, canProceedToPayment, null);
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
