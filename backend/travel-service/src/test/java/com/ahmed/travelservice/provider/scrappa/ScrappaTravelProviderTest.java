package com.ahmed.travelservice.provider.scrappa;

import com.ahmed.travelservice.config.ScrappaProperties;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.dto.response.FlightLegDto;
import com.ahmed.travelservice.dto.response.FlightOfferDto;
import com.ahmed.travelservice.provider.ProviderCapability;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.scrappa.ScrappaClient;
import com.ahmed.travelservice.provider.impl.scrappa.ScrappaTravelProvider;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaFlight;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaFlightResponse;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaLeg;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for ScrappaTravelProvider normalization logic.
 * Uses MockWebServer to avoid real Scrappa API calls — zero credits consumed.
 */
class ScrappaTravelProviderTest {

    private MockWebServer mockServer;
    private ScrappaTravelProvider provider;

    @BeforeEach
    void setUp() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        ScrappaProperties props = new ScrappaProperties();
        props.setApiKey("test-mock-key");
        props.setBaseUrl(mockServer.url("/").toString().replaceAll("/$", ""));
        props.setConnectTimeoutMs(3000);
        props.setReadTimeoutMs(5000);

        ScrappaClient client = new ScrappaClient(props);
        provider = new ScrappaTravelProvider(client);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockServer.shutdown();
    }

    // ─── Provider metadata ─────────────────────────────────────────────────────

    @Test
    void providerCode_isSCRAPPA() {
        assertThat(provider.getMetadata().getProviderCode()).isEqualTo("SCRAPPA");
    }

    @Test
    void providerSupports_flights() {
        assertThat(provider.supports(ProviderCapability.FLIGHTS)).isTrue();
    }

    @Test
    void providerDoesNotSupport_hotels() {
        assertThat(provider.supports(ProviderCapability.HOTELS)).isFalse();
    }

    @Test
    void providerDoesNotSupport_activities() {
        assertThat(provider.supports(ProviderCapability.ACTIVITIES)).isFalse();
    }

    @Test
    void providerDoesNotSupport_transfers() {
        assertThat(provider.supports(ProviderCapability.TRANSFERS)).isFalse();
    }

    @Test
    void providerDoesNotSupport_revalidation() {
        assertThat(provider.supports(ProviderCapability.REVALIDATION)).isFalse();
    }

    // ─── Unsupported capabilities ──────────────────────────────────────────────

    @Test
    void searchHotels_throwsCapabilityNotSupported() {
        assertThatThrownBy(() -> provider.searchHotels(null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED));
    }

    @Test
    void searchActivities_throwsCapabilityNotSupported() {
        assertThatThrownBy(() -> provider.searchActivities(null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED));
    }

    @Test
    void searchTransfers_throwsCapabilityNotSupported() {
        assertThatThrownBy(() -> provider.searchTransfers(null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED));
    }

    @Test
    void revalidateOffer_throwsCapabilityNotSupported() {
        assertThatThrownBy(() -> provider.revalidateOffer(null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.CAPABILITY_NOT_SUPPORTED));
    }

    // ─── One-way normalization ─────────────────────────────────────────────────

    @Test
    void searchFlights_oneWay_normalizesOffer() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                            "flights": [{
                                "price": 149.99,
                                "currency": "EUR",
                                "stops": 0,
                                "total_duration_minutes": 225,
                                "legs": [{
                                    "departure_airport": "CMN",
                                    "arrival_airport": "CDG",
                                    "departure_time": "2026-11-15T06:00:00",
                                    "arrival_time": "2026-11-15T09:45:00",
                                    "airline": "AT",
                                    "airline_name": "Royal Air Maroc",
                                    "flight_number": "703",
                                    "duration_minutes": 225
                                }]
                            }],
                            "search_metadata": {}
                        }
                        """));

        List<FlightOfferDto> offers = provider.searchFlights(oneWayQuery());

        assertThat(offers).hasSize(1);
        FlightOfferDto offer = offers.get(0);

        assertThat(offer.getProvider()).isEqualTo("SCRAPPA");
        assertThat(offer.getOfferId()).isNotBlank();
        assertThat(offer.getAirlineCode()).isEqualTo("AT");
        assertThat(offer.getAirlineName()).isEqualTo("Royal Air Maroc");
        assertThat(offer.getFlightNumber()).isEqualTo("703");
        assertThat(offer.getOrigin()).isEqualTo("CMN");
        assertThat(offer.getDestination()).isEqualTo("CDG");
        assertThat(offer.getDepartureTime()).isEqualTo("2026-11-15T06:00:00");
        assertThat(offer.getArrivalTime()).isEqualTo("2026-11-15T09:45:00");
        assertThat(offer.getPrice()).isEqualByComparingTo("149.99");
        assertThat(offer.getCurrency()).isEqualTo("EUR");
        assertThat(offer.getTotalDurationMinutes()).isEqualTo(225);
        assertThat(offer.getStops()).isEqualTo(0);
        assertThat(offer.getItineraryComplete()).isTrue();
        assertThat(offer.getPriceType()).isNull();
        assertThat(offer.getDepartureToken()).isNull();
        assertThat(offer.getAvailableSeats()).isNull();
    }

    @Test
    void searchFlights_oneWay_priceIsBigDecimalPrecise() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"flights\": [{\"price\": 99.50, \"currency\": \"EUR\", \"legs\": []}], \"search_metadata\": {}}"));

        List<FlightOfferDto> offers = provider.searchFlights(oneWayQuery());

        assertThat(offers.get(0).getPrice()).isInstanceOf(BigDecimal.class);
        assertThat(offers.get(0).getPrice()).isEqualByComparingTo("99.50");
    }

    @Test
    void searchFlights_oneWay_multipleLegs_normalizesCorrectly() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                            "flights": [{
                                "price": 250.00,
                                "currency": "EUR",
                                "stops": 1,
                                "total_duration_minutes": 480,
                                "legs": [
                                    {
                                        "departure_airport": "CMN",
                                        "arrival_airport": "MAD",
                                        "departure_time": "2026-11-15T07:00:00",
                                        "arrival_time": "2026-11-15T10:00:00",
                                        "airline": "IB",
                                        "flight_number": "3756",
                                        "duration_minutes": 180
                                    },
                                    {
                                        "departure_airport": "MAD",
                                        "arrival_airport": "CDG",
                                        "departure_time": "2026-11-15T12:00:00",
                                        "arrival_time": "2026-11-15T14:00:00",
                                        "airline": "IB",
                                        "flight_number": "3410",
                                        "duration_minutes": 120
                                    }
                                ]
                            }],
                            "search_metadata": {}
                        }
                        """));

        List<FlightOfferDto> offers = provider.searchFlights(oneWayQuery());

        assertThat(offers).hasSize(1);
        FlightOfferDto offer = offers.get(0);
        assertThat(offer.getStops()).isEqualTo(1);
        assertThat(offer.getTotalDurationMinutes()).isEqualTo(480);
        assertThat(offer.getLegs()).hasSize(2);

        FlightLegDto leg1 = offer.getLegs().get(0);
        assertThat(leg1.getDepartureAirport()).isEqualTo("CMN");
        assertThat(leg1.getArrivalAirport()).isEqualTo("MAD");

        FlightLegDto leg2 = offer.getLegs().get(1);
        assertThat(leg2.getDepartureAirport()).isEqualTo("MAD");
        assertThat(leg2.getArrivalAirport()).isEqualTo("CDG");

        // Origin from first leg, destination from last leg
        assertThat(offer.getOrigin()).isEqualTo("CMN");
        assertThat(offer.getDestination()).isEqualTo("CDG");
    }

    @Test
    void searchFlights_emptyResults_returnsEmptyList() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"flights\": [], \"search_metadata\": {}}"));

        List<FlightOfferDto> offers = provider.searchFlights(oneWayQuery());
        assertThat(offers).isEmpty();
    }

    // ─── Round-trip normalization ──────────────────────────────────────────────

    @Test
    void searchFlights_roundTrip_outbound_normalizesCorrectly() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                            "flights": [{
                                "trip_type": "round_trip",
                                "itinerary_complete": false,
                                "price_type": "round_trip_starting",
                                "departure_token": "tok_test_outbound_abc",
                                "price": 299.00,
                                "currency": "EUR",
                                "outbound_stops": 0,
                                "outbound_duration_minutes": 225,
                                "outbound_legs": [{
                                    "departure_airport": "CMN",
                                    "arrival_airport": "CDG",
                                    "departure_time": "2026-11-15T06:00:00",
                                    "arrival_time": "2026-11-15T09:45:00",
                                    "airline": "AT",
                                    "flight_number": "703",
                                    "duration_minutes": 225
                                }],
                                "legs": [{
                                    "departure_airport": "CMN",
                                    "arrival_airport": "CDG",
                                    "departure_time": "2026-11-15T06:00:00",
                                    "arrival_time": "2026-11-15T09:45:00",
                                    "airline": "AT",
                                    "flight_number": "703",
                                    "duration_minutes": 225
                                }],
                                "return_legs": []
                            }],
                            "search_metadata": {"stage": "outbound"}
                        }
                        """));

        List<FlightOfferDto> offers = provider.searchFlights(roundTripQuery());

        assertThat(offers).hasSize(1);
        FlightOfferDto offer = offers.get(0);

        assertThat(offer.getItineraryComplete()).isFalse();
        assertThat(offer.getPriceType()).isEqualTo("round_trip_starting");
        assertThat(offer.getDepartureToken()).isEqualTo("tok_test_outbound_abc");
        assertThat(offer.getPrice()).isEqualByComparingTo("299.00");
        assertThat(offer.getStops()).isEqualTo(0);
        assertThat(offer.getTotalDurationMinutes()).isEqualTo(225);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private FlightSearchQuery oneWayQuery() {
        return FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false).currency("EUR")
                .build();
    }

    private FlightSearchQuery roundTripQuery() {
        return FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .returnDate(LocalDate.of(2026, 11, 22))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false).currency("EUR")
                .build();
    }
}
