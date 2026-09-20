package com.ahmed.travelservice.domain.query;

import com.ahmed.travelservice.domain.enums.ActivityCategory;
import com.ahmed.travelservice.domain.enums.TransferType;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.dto.request.ActivitySearchRequest;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.HotelSearchRequest;
import com.ahmed.travelservice.dto.request.TransferSearchRequest;

public final class TravelSearchMapper {

    private TravelSearchMapper() {
    }

    public static FlightSearchQuery toQuery(FlightSearchRequest req) {
        if (req == null) return null;
        return FlightSearchQuery.builder()
                .origin(req.getOrigin().trim())
                .destination(req.getDestination().trim())
                .departureDate(req.getDepartureDate())
                .returnDate(req.getReturnDate())
                .adults(req.getAdults() != null ? req.getAdults() : 1)
                .children(req.getChildren() != null ? req.getChildren() : 0)
                .infants(req.getInfants() != null ? req.getInfants() : 0)
                .travelClass(req.getTravelClass() != null ? req.getTravelClass() : TravelClass.ECONOMY)
                .nonStop(Boolean.TRUE.equals(req.getNonStop()))
                .currency(req.getCurrency() != null ? req.getCurrency().trim().toUpperCase() : "EUR")
                .build();
    }

    public static HotelSearchQuery toQuery(HotelSearchRequest req) {
        if (req == null) return null;
        return HotelSearchQuery.builder()
                .destination(req.getDestination().trim())
                .checkIn(req.getCheckIn())
                .checkOut(req.getCheckOut())
                .rooms(req.getRooms() != null ? req.getRooms() : 1)
                .adults(req.getAdults() != null ? req.getAdults() : 1)
                .children(req.getChildren() != null ? req.getChildren() : 0)
                .propertyType(req.getPropertyType() != null ? req.getPropertyType().trim().toUpperCase() : "ALL")
                .currency(req.getCurrency() != null ? req.getCurrency().trim().toUpperCase() : "EUR")
                .build();
    }

    public static ActivitySearchQuery toQuery(ActivitySearchRequest req) {
        if (req == null) return null;
        return ActivitySearchQuery.builder()
                .destination(req.getDestination().trim())
                .date(req.getDate())
                .travelers(req.getTravelers() != null ? req.getTravelers() : 1)
                .category(ActivityCategory.fromString(req.getCategory()))
                .radiusKm(req.getRadiusKm() != null ? req.getRadiusKm() : 25)
                .currency(req.getCurrency() != null ? req.getCurrency().trim().toUpperCase() : "EUR")
                .build();
    }

    public static TransferSearchQuery toQuery(TransferSearchRequest req) {
        if (req == null) return null;
        return TransferSearchQuery.builder()
                .pickup(req.getPickup().trim())
                .dropoff(req.getDropoff().trim())
                .date(req.getDate())
                .time(req.getTime())
                .passengers(req.getPassengers() != null ? req.getPassengers() : 1)
                .transferType(req.getTransferType() != null ? req.getTransferType() : TransferType.TAXI)
                .currency(req.getCurrency() != null ? req.getCurrency().trim().toUpperCase() : "EUR")
                .build();
    }
}
