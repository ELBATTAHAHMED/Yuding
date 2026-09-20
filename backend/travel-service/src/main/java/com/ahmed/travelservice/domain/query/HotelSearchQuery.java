package com.ahmed.travelservice.domain.query;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Value
@Builder
public class HotelSearchQuery {
    String destination;
    String city;
    String countryCode;
    LocalDate checkIn;
    LocalDate checkOut;
    int rooms;
    int adults;
    int children;
    String propertyType;
    String currency;
    String guestNationality;
    List<RoomOccupancy> occupancies;

    @Value
    @Builder
    public static class RoomOccupancy {
        int adults;
        List<Integer> childrenAges;

        public int getChildCount() {
            return childrenAges != null ? childrenAges.size() : 0;
        }
    }

    public long getNumberOfNights() {
        if (checkIn == null || checkOut == null) return 0;
        return ChronoUnit.DAYS.between(checkIn, checkOut);
    }

    public int getTotalGuests() {
        if (occupancies != null && !occupancies.isEmpty()) {
            return occupancies.stream().mapToInt(o -> o.getAdults() + o.getChildCount()).sum();
        }
        return adults + children;
    }

    public List<RoomOccupancy> getOccupanciesOrDefault() {
        if (occupancies != null && !occupancies.isEmpty()) {
            return occupancies;
        }
        int roomCount = Math.max(1, rooms);
        int adultsPerRoom = Math.max(1, adults / roomCount);
        int remainderAdults = adults % roomCount;

        List<RoomOccupancy> list = new ArrayList<>();
        for (int i = 0; i < roomCount; i++) {
            int a = adultsPerRoom + (i < remainderAdults ? 1 : 0);
            list.add(RoomOccupancy.builder()
                    .adults(Math.max(1, a))
                    .childrenAges(Collections.emptyList())
                    .build());
        }
        return Collections.unmodifiableList(list);
    }
}
