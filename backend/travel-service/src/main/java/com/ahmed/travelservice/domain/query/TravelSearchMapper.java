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

        String rawDest = req.getDestination() != null ? req.getDestination().trim() : "";
        String city = req.getCity() != null && !req.getCity().isBlank() ? req.getCity().trim() : extractCity(rawDest);
        String countryCode = req.getCountryCode() != null && !req.getCountryCode().isBlank()
                ? req.getCountryCode().trim().toUpperCase() : extractCountryCode(rawDest);

        java.util.List<HotelSearchQuery.RoomOccupancy> occupancies = null;
        if (req.getOccupancies() != null && !req.getOccupancies().isEmpty()) {
            occupancies = req.getOccupancies().stream()
                    .map(o -> HotelSearchQuery.RoomOccupancy.builder()
                            .adults(o.getAdults() != null ? o.getAdults() : 1)
                            .childrenAges(o.getChildrenAges() != null ? new java.util.ArrayList<>(o.getChildrenAges()) : java.util.Collections.emptyList())
                            .build())
                    .toList();
        }

        int rooms = occupancies != null ? occupancies.size() : (req.getRooms() != null ? req.getRooms() : 1);
        int adults = occupancies != null ? occupancies.stream().mapToInt(HotelSearchQuery.RoomOccupancy::getAdults).sum() : (req.getAdults() != null ? req.getAdults() : 1);
        int children = occupancies != null ? occupancies.stream().mapToInt(HotelSearchQuery.RoomOccupancy::getChildCount).sum() : (req.getChildren() != null ? req.getChildren() : 0);

        return HotelSearchQuery.builder()
                .destination(rawDest)
                .city(city)
                .countryCode(countryCode)
                .checkIn(req.getCheckIn())
                .checkOut(req.getCheckOut())
                .rooms(rooms)
                .adults(adults)
                .children(children)
                .propertyType(req.getPropertyType() != null ? req.getPropertyType().trim().toUpperCase() : "ALL")
                .currency(req.getCurrency() != null ? req.getCurrency().trim().toUpperCase() : "EUR")
                .guestNationality(req.getGuestNationality() != null && !req.getGuestNationality().isBlank()
                        ? req.getGuestNationality().trim().toUpperCase() : "MA")
                .occupancies(occupancies)
                .build();
    }

    private static String extractCity(String destination) {
        if (destination == null || destination.isBlank()) return "";
        if (destination.contains(",")) {
            return destination.split(",")[0].trim();
        }
        return destination.trim();
    }

    private static String extractCountryCode(String destination) {
        if (destination == null || destination.isBlank()) return "MA";
        if (destination.contains(",")) {
            String part = destination.split(",")[1].trim();
            if (part.length() == 2) {
                return part.toUpperCase();
            }
            String lower = part.toLowerCase();
            if (lower.contains("maroc") || lower.contains("morocco")) return "MA";
            if (lower.contains("france")) return "FR";
            if (lower.contains("espagne") || lower.contains("spain")) return "ES";
            if (lower.contains("états-unis") || lower.contains("etats-unis") || lower.contains("usa") || lower.contains("united states")) return "US";
            if (lower.contains("emirates") || lower.contains("émirats") || lower.contains("dubai")) return "AE";
            if (lower.contains("italie") || lower.contains("italy")) return "IT";
            if (lower.contains("turquie") || lower.contains("turkey")) return "TR";
        }

        String lowerDest = destination.toLowerCase().trim();
        return switch (lowerDest) {
            case "marrakech", "casablanca", "agadir", "tanger", "tangier", "rabat", "fès", "fes", "essaouira", "chefchaouen", "dakhla", "ouarzazate" -> "MA";
            case "paris", "nice", "lyon", "marseille" -> "FR";
            case "madrid", "barcelona", "malaga" -> "ES";
            case "dubai", "abu dhabi" -> "AE";
            case "london" -> "GB";
            case "rome", "milan" -> "IT";
            case "istanbul" -> "TR";
            default -> "MA";
        };
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
