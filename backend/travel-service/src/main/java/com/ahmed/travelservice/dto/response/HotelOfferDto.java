package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import com.ahmed.travelservice.dto.image.ImageAssetDto;

/**
 * Normalized provider-neutral hotel offer returned to the Yuding frontend.
 * Extended in Phase 23 with Nuitee Connect real provider-backed fields and room offers list.
 * All monetary amounts use BigDecimal exclusively — never float/double.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HotelOfferDto {

    /** Search result reference / primary offer ID. */
    private String offerId;

    /** Server-issued opaque selection reference for trusted Offer Snapshot creation. */
    private String selectionRef;

    /** Provider code, e.g. "NUITEE". */
    private String provider;

    /** Provider property identifier (e.g. "lp1897"). */
    private String hotelId;

    /** Human-readable hotel name. */
    private String hotelName;

    /** Destination label. */
    private String destination;

    /** Physical street address of the hotel. */
    private String address;

    /** City where hotel is situated. */
    private String city;

    /** Country code or country name where hotel is situated. */
    private String country;

    /** Property classification (e.g. "HOTEL", "RESORT", "APARTMENT"). */
    private String propertyType;

    /** Normalized accommodation category derived from Nuitee location_type. */
    private String accommodationType;

    /** Brief summary of room options (e.g. "Standard King Room"). */
    private String roomSummary;

    /** Provider-supplied property description, when available. */
    private String description;

    /** Provider-supplied images only; may contain just a primary photo. */
    private List<String> galleryUrls;

    /** Check-in date. */
    private LocalDate checkIn;

    /** Check-out date. */
    private LocalDate checkOut;

    /** Starting/lowest price per night. MUST be BigDecimal. */
    private BigDecimal pricePerNight;

    /** Starting/lowest total price. MUST be BigDecimal. */
    private BigDecimal totalPrice;

    /** ISO currency code (e.g. "EUR", "USD", "MAD"). */
    private String currency;

    /** Conversion for the existing per-night headline price. */
    private PriceConversionSnapshot priceConversion;

    /** Conversion for the existing total-stay price, kept distinct from the nightly amount. */
    private PriceConversionSnapshot totalPriceConversion;

    /** Hotel official star rating (e.g. 3.0, 4.0, 5.0). */
    private Double starRating;

    /** Guest review score (e.g. 8.5 out of 10). */
    private Double reviewScore;

    /** Total number of guest reviews. */
    private Integer reviewCount;

    /** Primary image URL of the hotel. */
    private String imageUrl;

    /** Provenance-aware image asset containing source attribution and entity-authenticity flag. */
    private ImageAssetDto imageAsset;

    /** Availability state (e.g. "AVAILABLE_ON_PROVIDER"). */
    private String availabilityState;

    /** Detailed room options returned by provider rates. */
    private List<HotelRoomOfferDto> roomOffers;
}
