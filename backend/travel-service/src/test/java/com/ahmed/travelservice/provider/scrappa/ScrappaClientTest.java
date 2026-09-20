package com.ahmed.travelservice.provider.scrappa;

import com.ahmed.travelservice.config.ScrappaProperties;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.scrappa.ScrappaClient;
import com.ahmed.travelservice.provider.impl.scrappa.dto.ScrappaFlightResponse;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.*;

/**
 * Unit tests for ScrappaClient.
 * Uses MockWebServer (OkHttp) to intercept HTTP calls — NO real Scrappa credits consumed.
 * All assertions use the mocked server's recorded requests and mock responses.
 */
class ScrappaClientTest {

    private MockWebServer mockServer;
    private ScrappaClient client;

    @BeforeEach
    void setUp() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        ScrappaProperties props = new ScrappaProperties();
        props.setApiKey("test-api-key-mock");
        props.setBaseUrl(mockServer.url("/").toString().replaceAll("/$", ""));
        props.setConnectTimeoutMs(3000);
        props.setReadTimeoutMs(5000);

        client = new ScrappaClient(props);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockServer.shutdown();
    }

    // ─── IATA extraction tests ─────────────────────────────────────────────────

    @Test
    void extractIata_fromParenthesizedFormat() {
        assertThat(ScrappaClient.extractIata("Casablanca (CMN)", "origin")).isEqualTo("CMN");
        assertThat(ScrappaClient.extractIata("Paris (CDG)", "dest")).isEqualTo("CDG");
        assertThat(ScrappaClient.extractIata("New York (JFK)", "dest")).isEqualTo("JFK");
    }

    @Test
    void extractIata_fromBareCode() {
        assertThat(ScrappaClient.extractIata("CMN", "origin")).isEqualTo("CMN");
        assertThat(ScrappaClient.extractIata("CDG", "dest")).isEqualTo("CDG");
        assertThat(ScrappaClient.extractIata("cmn", "origin")).isEqualTo("CMN");
    }

    @Test
    void extractIata_invalid_throwsProviderRequestInvalid() {
        assertThatThrownBy(() -> ScrappaClient.extractIata("Casablanca", "origin"))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID));
    }

    @Test
    void extractIata_null_throwsProviderRequestInvalid() {
        assertThatThrownBy(() -> ScrappaClient.extractIata(null, "origin"))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID));
    }

    // ─── Cabin class mapping ───────────────────────────────────────────────────

    @Test
    void mapCabinClass_allValues() {
        assertThat(ScrappaClient.mapCabinClass(TravelClass.ECONOMY)).isEqualTo("economy");
        assertThat(ScrappaClient.mapCabinClass(TravelClass.PREMIUM_ECONOMY)).isEqualTo("premium_economy");
        assertThat(ScrappaClient.mapCabinClass(TravelClass.BUSINESS)).isEqualTo("business");
        assertThat(ScrappaClient.mapCabinClass(TravelClass.FIRST)).isEqualTo("first");
        assertThat(ScrappaClient.mapCabinClass(null)).isNull();
    }

    // ─── One-way request mapping ───────────────────────────────────────────────

    @Test
    void searchOneWay_buildsCorrectUri() throws InterruptedException {
        enqueueEmptyFlightsResponse();

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin("CMN")
                .destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .adults(2)
                .children(1)
                .infants(1)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(true)
                .currency("EUR")
                .build();

        client.searchOneWay(query);

        RecordedRequest request = mockServer.takeRequest();
        String path = request.getPath();

        assertThat(path).contains("/flights/one-way");
        assertThat(path).contains("origin=CMN");
        assertThat(path).contains("destination=CDG");
        assertThat(path).contains("departure_date=2026-11-15");
        assertThat(path).contains("adults=2");
        assertThat(path).contains("children=1");
        // Yuding infants → Scrappa infants_on_lap
        assertThat(path).contains("infants_on_lap=1");
        assertThat(path).doesNotContain("infants_in_seat");
        assertThat(path).contains("cabin_class=economy");
        assertThat(path).contains("max_stops=nonstop");
        assertThat(path).contains("currency=EUR");
    }

    @Test
    void searchOneWay_sendsApiKeyHeader() throws InterruptedException {
        enqueueEmptyFlightsResponse();

        client.searchOneWay(minimalOneWayQuery());

        RecordedRequest request = mockServer.takeRequest();
        // Key must be sent in X-API-KEY header
        assertThat(request.getHeader("X-API-KEY")).isEqualTo("test-api-key-mock");
    }

    @Test
    void searchOneWay_nonStop_false_omitsMaxStops() throws InterruptedException {
        enqueueEmptyFlightsResponse();

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false)
                .currency("EUR")
                .build();

        client.searchOneWay(query);

        RecordedRequest request = mockServer.takeRequest();
        assertThat(request.getPath()).doesNotContain("max_stops");
    }

    @Test
    void searchOneWay_noInfants_omitsInfantsOnLap() throws InterruptedException {
        enqueueEmptyFlightsResponse();

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false).currency("EUR")
                .build();

        client.searchOneWay(query);

        RecordedRequest request = mockServer.takeRequest();
        assertThat(request.getPath()).doesNotContain("infants_on_lap");
    }

    @Test
    void searchOneWay_parsesFlightResponse() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("""
                        {
                            "flights": [
                                {
                                    "price": 149.99,
                                    "currency": "EUR",
                                    "stops": 0,
                                    "total_duration_minutes": 225,
                                    "legs": [
                                        {
                                            "departure_airport": "CMN",
                                            "arrival_airport": "CDG",
                                            "departure_time": "2026-11-15T06:00:00",
                                            "arrival_time": "2026-11-15T09:45:00",
                                            "airline": "AT",
                                            "airline_name": "Royal Air Maroc",
                                            "flight_number": "703",
                                            "duration_minutes": 225
                                        }
                                    ]
                                }
                            ],
                            "search_metadata": {}
                        }
                        """));

        ScrappaFlightResponse response = client.searchOneWay(minimalOneWayQuery());

        assertThat(response.safeFlights()).hasSize(1);
        assertThat(response.safeFlights().get(0).getPrice())
                .isEqualByComparingTo("149.99");
        assertThat(response.safeFlights().get(0).getCurrency()).isEqualTo("EUR");
        assertThat(response.safeFlights().get(0).getStops()).isEqualTo(0);
        assertThat(response.safeFlights().get(0).getTotalDurationMinutes()).isEqualTo(225);
        assertThat(response.safeFlights().get(0).getLegs()).hasSize(1);
        assertThat(response.safeFlights().get(0).getLegs().get(0).getAirlineCode()).isEqualTo("AT");
    }

    // ─── Round-trip request mapping ────────────────────────────────────────────

    @Test
    void searchRoundTrip_buildsCorrectUri() throws InterruptedException {
        enqueueEmptyFlightsResponse();

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .returnDate(LocalDate.of(2026, 11, 22))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false).currency("EUR")
                .build();

        client.searchRoundTrip(query);

        RecordedRequest request = mockServer.takeRequest();
        String path = request.getPath();

        assertThat(path).contains("/flights/v2/round-trip");
        assertThat(path).contains("origin=CMN");
        assertThat(path).contains("destination=CDG");
        assertThat(path).contains("departure_date=2026-11-15");
        assertThat(path).contains("return_date=2026-11-22");
        assertThat(path).doesNotContain("departure_token");
    }

    @Test
    void searchRoundTrip_withDepartureToken_includesToken() throws InterruptedException {
        enqueueEmptyFlightsResponse();

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .returnDate(LocalDate.of(2026, 11, 22))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false).currency("EUR")
                .build();

        client.searchRoundTrip(query, "tok_abc123xyz");

        RecordedRequest request = mockServer.takeRequest();
        assertThat(request.getPath()).contains("departure_token=tok_abc123xyz");
    }

    // ─── Error mapping tests ───────────────────────────────────────────────────

    @Test
    void searchOneWay_401_throwsAuthenticationFailed() {
        mockServer.enqueue(new MockResponse().setResponseCode(401)
                .setBody("{\"message\":\"Unauthorized\"}"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED));
    }

    @Test
    void searchOneWay_402_throwsQuotaExhausted() {
        mockServer.enqueue(new MockResponse().setResponseCode(402)
                .setBody("{\"message\":\"Insufficient Credits\"}"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_QUOTA_EXHAUSTED));
    }

    @Test
    void searchOneWay_422_throwsRequestInvalid() {
        mockServer.enqueue(new MockResponse().setResponseCode(422)
                .setBody("{\"message\":\"Validation Error\"}"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID));
    }

    @Test
    void searchOneWay_429_throwsRateLimited() {
        mockServer.enqueue(new MockResponse().setResponseCode(429)
                .setBody("{\"message\":\"Rate Limited\"}"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_RATE_LIMITED));
    }

    @Test
    void searchOneWay_503_throwsUnavailable() {
        mockServer.enqueue(new MockResponse().setResponseCode(503)
                .setBody("{\"message\":\"Service Unavailable\"}"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_UNAVAILABLE));
    }

    @Test
    void searchOneWay_500_throwsUnavailable() {
        mockServer.enqueue(new MockResponse().setResponseCode(500)
                .setBody("{\"message\":\"Internal Error\"}"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_UNAVAILABLE));
    }

    @Test
    void searchOneWay_malformedJson_throwsResponseInvalid() {
        mockServer.enqueue(new MockResponse().setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("not-valid-json{{{"));

        assertThatThrownBy(() -> client.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_RESPONSE_INVALID));
    }

    @Test
    void searchOneWay_unconfiguredApiKey_throwsNotConfigured() {
        ScrappaProperties unconfiguredProps = new ScrappaProperties();
        unconfiguredProps.setApiKey("");
        unconfiguredProps.setBaseUrl(mockServer.url("/").toString());
        ScrappaClient unconfiguredClient = new ScrappaClient(unconfiguredProps);

        assertThatThrownBy(() -> unconfiguredClient.searchOneWay(minimalOneWayQuery()))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> assertThat(((TravelProviderException) e).getErrorCode())
                        .isEqualTo(ProviderErrorCode.PROVIDER_NOT_CONFIGURED));
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    private FlightSearchQuery minimalOneWayQuery() {
        return FlightSearchQuery.builder()
                .origin("CMN").destination("CDG")
                .departureDate(LocalDate.of(2026, 11, 15))
                .adults(1).children(0).infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false).currency("EUR")
                .build();
    }

    private void enqueueEmptyFlightsResponse() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"flights\": [], \"search_metadata\": {}}"));
    }
}
