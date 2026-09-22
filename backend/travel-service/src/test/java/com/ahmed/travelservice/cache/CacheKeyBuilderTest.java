package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.domain.enums.ActivityCategory;
import com.ahmed.travelservice.domain.enums.TransferType;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.*;
import com.ahmed.travelservice.dto.geo.GeoAutocompleteRequest;
import com.ahmed.travelservice.dto.geo.GeoGeocodeRequest;
import com.ahmed.travelservice.dto.geo.GeoReverseRequest;
import com.ahmed.travelservice.dto.geo.NearbyPlacesRequest;
import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("CacheKeyBuilder Invariants & Normalization Tests")
class CacheKeyBuilderTest {

    private static final String VERSION = "v1";

    @Test
    @DisplayName("Namespaced key follows yuding:v2:{domain}:{provider}:{version}:{descriptor} format")
    void testKeyFormat() {
        String key = CacheKeyBuilder.currency("frankfurter", VERSION, "EUR", "MAD");
        assertEquals("yuding:v2:currency:frankfurter:v1:EUR:MAD", key);
    }

    @Test
    @DisplayName("Currency keys normalize to uppercase")
    void testCurrencyKeyNormalization() {
        String key1 = CacheKeyBuilder.currency("frankfurter", VERSION, "eur", "mad");
        String key2 = CacheKeyBuilder.currency("frankfurter", VERSION, "EUR ", " MAD");
        assertEquals("yuding:v2:currency:frankfurter:v1:EUR:MAD", key1);
        assertEquals(key1, key2);

        String usdKey = CacheKeyBuilder.currency("frankfurter", VERSION, "USD", "MAD");
        assertNotEquals(key1, usdKey);
    }

    @Test
    @DisplayName("Coordinates are normalized to 4 decimal places")
    void testCoordinatePrecisionNormalization() {
        String key1 = CacheKeyBuilder.weather("openmeteo", VERSION, 31.629472, -7.981084, 7);
        String key2 = CacheKeyBuilder.weather("openmeteo", VERSION, 31.629511, -7.981122, 7);
        assertEquals("yuding:v2:weather:openmeteo:v1:31.6295:-7.9811:d7", key1);
        assertEquals(key1, key2);

        // Substantially different coordinates must generate different keys
        String keyParis = CacheKeyBuilder.weather("openmeteo", VERSION, 48.8566, 2.3522, 7);
        assertNotEquals(key1, keyParis);
    }

    @Test
    @DisplayName("POI categories are sorted deterministically regardless of input order")
    void testPoiCategoriesSorting() {
        NearbyPlacesRequest req1 = NearbyPlacesRequest.builder()
                .latitude(31.6295)
                .longitude(-7.9811)
                .radiusMeters(1000)
                .categories(List.of("museums", "attractions", "restaurants"))
                .limit(20)
                .build();

        NearbyPlacesRequest req2 = NearbyPlacesRequest.builder()
                .latitude(31.6295)
                .longitude(-7.9811)
                .radiusMeters(1000)
                .categories(List.of("restaurants", "attractions", "museums"))
                .limit(20)
                .build();

        String key1 = CacheKeyBuilder.geoPoi("geoapify", VERSION, req1);
        String key2 = CacheKeyBuilder.geoPoi("geoapify", VERSION, req2);
        assertEquals(key1, key2);
    }

    @Test
    @DisplayName("Geo autocomplete keys normalize text and filters")
    void testGeoAutocompleteKey() {
        GeoAutocompleteRequest req1 = GeoAutocompleteRequest.builder()
                .text(" Marrakech ")
                .type("city")
                .country("ma")
                .language("fr")
                .limit(8)
                .build();

        GeoAutocompleteRequest req2 = GeoAutocompleteRequest.builder()
                .text("marrakech")
                .type("CITY")
                .country("MA")
                .language("FR")
                .limit(8)
                .build();

        String key1 = CacheKeyBuilder.geoAutocomplete("geoapify", VERSION, req1);
        String key2 = CacheKeyBuilder.geoAutocomplete("geoapify", VERSION, req2);
        assertEquals(key1, key2);

        // Different text yields different key
        GeoAutocompleteRequest reqCasablanca = GeoAutocompleteRequest.builder()
                .text("Casablanca")
                .type("city")
                .country("MA")
                .language("FR")
                .limit(8)
                .build();
        assertNotEquals(key1, CacheKeyBuilder.geoAutocomplete("geoapify", VERSION, reqCasablanca));
    }

    @Test
    @DisplayName("Destination image keys normalize city, country, and country code")
    void testDestinationImageKey() {
        DestinationImageRequest req1 = DestinationImageRequest.builder()
                .city("Marrakech")
                .country("Morocco")
                .countryCode("MA")
                .limit(3)
                .build();

        DestinationImageRequest req2 = DestinationImageRequest.builder()
                .city(" marrakech ")
                .country(" morocco ")
                .countryCode("ma")
                .limit(3)
                .build();

        String key1 = CacheKeyBuilder.destinationImages("pexels", VERSION, req1);
        String key2 = CacheKeyBuilder.destinationImages("pexels", VERSION, req2);
        assertEquals(key1, key2);
    }

    @Test
    @DisplayName("Flight search keys differentiate route, cabin class, passenger count, and dates")
    void testFlightSearchKeyDistinction() {
        FlightSearchQuery queryEconomy = FlightSearchQuery.builder()
                .origin("CMN")
                .destination("RAK")
                .departureDate(LocalDate.of(2026, 10, 1))
                .adults(1)
                .travelClass(TravelClass.ECONOMY)
                .currency("MAD")
                .build();

        FlightSearchQuery queryBusiness = FlightSearchQuery.builder()
                .origin("CMN")
                .destination("RAK")
                .departureDate(LocalDate.of(2026, 10, 1))
                .adults(1)
                .travelClass(TravelClass.BUSINESS)
                .currency("MAD")
                .build();

        FlightSearchQuery query2Pax = FlightSearchQuery.builder()
                .origin("CMN")
                .destination("RAK")
                .departureDate(LocalDate.of(2026, 10, 1))
                .adults(2)
                .travelClass(TravelClass.ECONOMY)
                .currency("MAD")
                .build();

        String keyEco = CacheKeyBuilder.flightSearch("scrappa", VERSION, queryEconomy);
        String keyBiz = CacheKeyBuilder.flightSearch("scrappa", VERSION, queryBusiness);
        String key2Pax = CacheKeyBuilder.flightSearch("scrappa", VERSION, query2Pax);

        assertNotEquals(keyEco, keyBiz);
        assertNotEquals(keyEco, key2Pax);
    }

    @Test
    @DisplayName("Hotel search keys differentiate dates, occupancy, and destinations")
    void testHotelSearchKeyDistinction() {
        HotelSearchQuery q1 = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(LocalDate.of(2026, 10, 1))
                .checkOut(LocalDate.of(2026, 10, 5))
                .rooms(1)
                .adults(2)
                .children(0)
                .currency("MAD")
                .build();

        HotelSearchQuery qDiffDates = HotelSearchQuery.builder()
                .destination("Marrakech")
                .checkIn(LocalDate.of(2026, 10, 2))
                .checkOut(LocalDate.of(2026, 10, 6))
                .rooms(1)
                .adults(2)
                .children(0)
                .currency("MAD")
                .build();

        String k1 = CacheKeyBuilder.hotelSearch("nuitee", VERSION, q1);
        String k2 = CacheKeyBuilder.hotelSearch("nuitee", VERSION, qDiffDates);
        assertNotEquals(k1, k2);
    }

    @Test
    @DisplayName("Transfer search keys are direction-sensitive (RAK->Hotel != Hotel->RAK)")
    void testTransferSearchDirectionSensitivity() {
        TransferSearchQuery inbound = TransferSearchQuery.builder()
                .pickup("RAK")
                .dropoff("Hotel Atlas")
                .date(LocalDate.of(2026, 10, 1))
                .time(LocalTime.of(14, 0))
                .passengers(2)
                .transferType(TransferType.PRIVATE)
                .currency("MAD")
                .build();

        TransferSearchQuery outbound = TransferSearchQuery.builder()
                .pickup("Hotel Atlas")
                .dropoff("RAK")
                .date(LocalDate.of(2026, 10, 1))
                .time(LocalTime.of(14, 0))
                .passengers(2)
                .transferType(TransferType.PRIVATE)
                .currency("MAD")
                .build();

        String kIn = CacheKeyBuilder.transferSearch("hbx", VERSION, inbound);
        String kOut = CacheKeyBuilder.transferSearch("hbx", VERSION, outbound);
        assertNotEquals(kIn, kOut);
    }

    @Test
    @DisplayName("Keys never contain raw API secrets, tokens, or personal passwords")
    void testSecretExclusion() {
        GeoAutocompleteRequest req = GeoAutocompleteRequest.builder().text("secret_api_key_test").build();
        String key = CacheKeyBuilder.geoAutocomplete("geoapify", VERSION, req);
        assertFalse(key.contains("Authorization"));
        assertFalse(key.contains("Bearer"));
        assertTrue(key.startsWith("yuding:v2:geo:geoapify:v1:auto:"));
    }
}
