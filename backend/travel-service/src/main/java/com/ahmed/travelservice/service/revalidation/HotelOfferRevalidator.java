package com.ahmed.travelservice.service.revalidation;

import com.ahmed.travelservice.domain.enums.OfferAvailabilityStatus;
import com.ahmed.travelservice.domain.enums.OfferPriceStatus;
import com.ahmed.travelservice.domain.query.HotelSearchQuery;
import com.ahmed.travelservice.dto.request.InternalRevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.HotelOfferDto;
import com.ahmed.travelservice.dto.response.HotelRoomOfferDto;
import com.ahmed.travelservice.dto.response.InternalRevalidationResultDto;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class HotelOfferRevalidator implements OfferRevalidator {

    private final TravelProviderRegistry providerRegistry;

    public HotelOfferRevalidator(TravelProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    @Override
    public boolean supports(String productType) {
        return "HOTEL".equalsIgnoreCase(productType) || "HOTELS".equalsIgnoreCase(productType);
    }

    @Override
    public InternalRevalidationResultDto revalidate(InternalRevalidateOfferRequest request) throws TravelProviderException {
        Map<String, Object> details = request.getSelectedDetails();
        if (details == null || details.isEmpty()) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Missing hotel snapshot details for live revalidation"
            );
        }

        String hotelId = (String) details.get("hotelId");
        String destination = (String) details.get("destination");
        String city = (String) details.get("city");
        String checkInStr = (String) details.get("checkIn");
        String checkOutStr = (String) details.get("checkOut");
        Object selectedRoomObj = details.get("selectedRoom");

        LocalDate checkIn = checkInStr != null ? LocalDate.parse(checkInStr) : null;
        LocalDate checkOut = checkOutStr != null ? LocalDate.parse(checkOutStr) : null;

        if (checkIn == null || checkOut == null || ((destination == null || destination.isBlank()) && (city == null || city.isBlank()))) {
            return InternalRevalidationResultDto.unavailable(
                    request.getProductType(), request.getProvider(), request.getProviderOfferId(),
                    "Insufficient stay or location details for live hotel rate check"
            );
        }

        HotelSearchQuery query = HotelSearchQuery.builder()
                .destination(destination != null ? destination : city)
                .city(city != null ? city : destination)
                .checkIn(checkIn)
                .checkOut(checkOut)
                .rooms(1)
                .adults(1)
                .currency(request.getSnapshotProviderCurrency() != null ? request.getSnapshotProviderCurrency() : "USD")
                .build();

        TravelProvider provider = resolveProvider(request.getProvider());
        log.info("[HotelRevalidator] Executing LIVE read-only rate check (NO PREBOOK) for hotelId: {}, dates: {} -> {}", hotelId, checkIn, checkOut);
        List<HotelOfferDto> freshHotels = provider.searchHotels(query);

        HotelOfferDto matchedHotel = findHotel(freshHotels, hotelId);
        Instant now = Instant.now();

        if (matchedHotel != null) {
            // Check specific room/rate if a room selection was part of snapshot
            if (selectedRoomObj instanceof Map<?, ?> roomMap) {
                String rateId = (String) roomMap.get("rateId");
                String roomName = (String) roomMap.get("roomName");

                HotelRoomOfferDto matchedRoom = findRoom(matchedHotel.getRoomOffers(), rateId, roomName);
                if (matchedRoom != null) {
                    BigDecimal currentAmount = matchedRoom.getPrice();
                    String currentCurrency = matchedRoom.getCurrency() != null ? matchedRoom.getCurrency() : matchedHotel.getCurrency();

                    OfferPriceStatus priceStatus = OfferPriceComparator.comparePrices(
                            request.getSnapshotProviderAmount(),
                            request.getSnapshotProviderCurrency(),
                            currentAmount,
                            currentCurrency
                    );

                    return InternalRevalidationResultDto.builder()
                            .productType(request.getProductType())
                            .provider(matchedHotel.getProvider() != null ? matchedHotel.getProvider() : request.getProvider())
                            .providerOfferId(request.getProviderOfferId())
                            .matchedProviderOfferId(matchedRoom.getOfferId())
                            .availabilityStatus(OfferAvailabilityStatus.AVAILABLE)
                            .priceStatus(priceStatus)
                            .snapshotProviderAmount(request.getSnapshotProviderAmount())
                            .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                            .currentProviderAmount(currentAmount)
                            .currentProviderCurrency(currentCurrency)
                            .revalidatedAt(now)
                            .providerExpiresAt(request.getProviderExpiresAt())
                            .message("Hotel room rate successfully revalidated live with provider (read-only, no prebook)")
                            .build();
                } else {
                    return InternalRevalidationResultDto.builder()
                            .productType(request.getProductType())
                            .provider(request.getProvider())
                            .providerOfferId(request.getProviderOfferId())
                            .availabilityStatus(OfferAvailabilityStatus.UNAVAILABLE)
                            .priceStatus(OfferPriceStatus.NOT_AVAILABLE)
                            .snapshotProviderAmount(request.getSnapshotProviderAmount())
                            .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                            .revalidatedAt(now)
                            .message("Selected hotel room/rate is no longer available from provider")
                            .build();
                }
            }

            // General hotel rate comparison
            BigDecimal currentAmount = matchedHotel.getTotalPrice() != null ? matchedHotel.getTotalPrice() : matchedHotel.getPricePerNight();
            OfferPriceStatus priceStatus = OfferPriceComparator.comparePrices(
                    request.getSnapshotProviderAmount(),
                    request.getSnapshotProviderCurrency(),
                    currentAmount,
                    matchedHotel.getCurrency()
            );

            return InternalRevalidationResultDto.builder()
                    .productType(request.getProductType())
                    .provider(matchedHotel.getProvider() != null ? matchedHotel.getProvider() : request.getProvider())
                    .providerOfferId(request.getProviderOfferId())
                    .matchedProviderOfferId(matchedHotel.getOfferId() != null ? matchedHotel.getOfferId() : matchedHotel.getHotelId())
                    .availabilityStatus(OfferAvailabilityStatus.AVAILABLE)
                    .priceStatus(priceStatus)
                    .snapshotProviderAmount(request.getSnapshotProviderAmount())
                    .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                    .currentProviderAmount(currentAmount)
                    .currentProviderCurrency(matchedHotel.getCurrency())
                    .revalidatedAt(now)
                    .providerExpiresAt(request.getProviderExpiresAt())
                    .message("Hotel rate successfully revalidated live with provider (read-only, no prebook)")
                    .build();
        }

        return InternalRevalidationResultDto.builder()
                .productType(request.getProductType())
                .provider(request.getProvider())
                .providerOfferId(request.getProviderOfferId())
                .availabilityStatus(OfferAvailabilityStatus.UNAVAILABLE)
                .priceStatus(OfferPriceStatus.NOT_AVAILABLE)
                .snapshotProviderAmount(request.getSnapshotProviderAmount())
                .snapshotProviderCurrency(request.getSnapshotProviderCurrency())
                .revalidatedAt(now)
                .message("Hotel is no longer available for requested stay dates")
                .build();
    }

    private TravelProvider resolveProvider(String providerCode) {
        if (providerCode != null && !providerCode.isBlank()) {
            try {
                TravelProvider p = providerRegistry.getProvider(providerCode);
                if (p != null) return p;
            } catch (Exception ignored) {}
        }
        TravelProvider p = providerRegistry.getProviderForProduct(TravelProduct.HOTELS);
        if (p == null) {
            throw TravelProviderException.notConfigured(providerCode != null ? providerCode : "HOTELS", "Hotel provider not configured");
        }
        return p;
    }

    private HotelOfferDto findHotel(List<HotelOfferDto> hotels, String hotelId) {
        if (hotels == null || hotels.isEmpty() || hotelId == null) return null;
        for (HotelOfferDto h : hotels) {
            if (hotelId.equalsIgnoreCase(h.getHotelId()) || hotelId.equalsIgnoreCase(h.getOfferId())) {
                return h;
            }
        }
        return null;
    }

    private HotelRoomOfferDto findRoom(List<HotelRoomOfferDto> rooms, String rateId, String roomName) {
        if (rooms == null || rooms.isEmpty()) return null;
        if (rateId != null && !rateId.isBlank()) {
            for (HotelRoomOfferDto r : rooms) {
                if (rateId.equalsIgnoreCase(r.getRateId()) || rateId.equalsIgnoreCase(r.getOfferId())) {
                    return r;
                }
            }
        }
        if (roomName != null && !roomName.isBlank()) {
            for (HotelRoomOfferDto r : rooms) {
                if (roomName.equalsIgnoreCase(r.getRoomName())) {
                    return r;
                }
            }
        }
        return null;
    }
}
