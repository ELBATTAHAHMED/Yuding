package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Normalized provider-neutral room offer returned within a hotel search result.
 * Holds real provider-backed room details and the genuine Nuitee offerId.
 * Money fields MUST use BigDecimal.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelRoomOfferDto {

    /** Real provider offer ID (e.g. Nuitee offerId). Never fabricated. */
    private String offerId;

    /** Provider internal rate ID. */
    private String rateId;

    /** Room type identifier from provider. */
    private String roomTypeId;

    /** Room name / description (e.g. "Standard King Room", "Deluxe Suite"). */
    private String roomName;

    /** Maximum guests allowed in this room. */
    private Integer maxOccupancy;

    /** Number of adults included in this rate. */
    private Integer adultCount;

    /** Number of children included in this rate. */
    private Integer childCount;

    /** Board short code (e.g. "RO", "BI", "HB", "FB", "AI"). */
    private String boardType;

    /** Board human-readable name (e.g. "Room Only", "Breakfast Included"). */
    private String boardName;

    /** Bed type description if provided (e.g. "King", "Double", "Twin"). */
    private String bedType;

    /** Whether this rate is refundable. */
    private Boolean refundable;

    /** Cancellation policy deadline if refundable (e.g. "2026-07-30 02:00:00"). */
    private String cancellationDeadline;

    /** Brief summary of cancellation terms. */
    private String cancellationSummary;

    /** Total price for this room offer. MUST be BigDecimal. */
    private BigDecimal price;

    /** Price per night. MUST be BigDecimal. */
    private BigDecimal pricePerNight;

    /** Currency ISO code (e.g. "EUR", "USD", "MAD"). */
    private String currency;

    /** Conversion for this room's total-stay price. */
    private PriceConversionSnapshot priceConversion;

    /** Conversion for this room's existing per-night price. */
    private PriceConversionSnapshot pricePerNightConversion;
}
