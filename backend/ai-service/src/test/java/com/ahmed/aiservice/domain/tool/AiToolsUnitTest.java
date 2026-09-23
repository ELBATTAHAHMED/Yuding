package com.ahmed.aiservice.domain.tool;

import com.ahmed.aiservice.client.InternalBookingClient;
import com.ahmed.aiservice.client.InternalTravelClient;
import com.ahmed.aiservice.domain.tool.impl.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpClientErrorException;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AiToolsUnitTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private InternalTravelClient travelClient;

    @Mock
    private InternalBookingClient bookingClient;

    @Nested
    @DisplayName("searchFlights tool tests")
    class SearchFlightsTests {
        private SearchFlightsTool tool;

        @BeforeEach
        void setUp() {
            tool = new SearchFlightsTool(travelClient, 5);
        }

        @Test
        @DisplayName("Valid flight search returns bounded, normalized flight offers")
        void searchFlightsSuccess() throws Exception {
            String json = """
                    {
                      "items": [
                        {
                          "id": "FL-001",
                          "airline": "Air France",
                          "flightNumber": "AF1234",
                          "originAirport": "CDG",
                          "destinationAirport": "NCE",
                          "departureTime": "2026-10-01T08:00:00",
                          "arrivalTime": "2026-10-01T09:30:00",
                          "durationMinutes": 90,
                          "stops": 0,
                          "price": 120.50,
                          "currency": "EUR"
                        }
                      ]
                    }
                    """;
            when(travelClient.searchFlights(anyMap())).thenReturn(objectMapper.readTree(json));

            AiToolCall call = new AiToolCall("call-1", "searchFlights", Map.of(
                    "origin", "cdg",
                    "destination", "nce",
                    "departureDate", "2026-10-01"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsKey("flights");
            assertThat(result.getData().get("totalFound")).isEqualTo(1);
        }

        @Test
        @DisplayName("Rejects unresolvable origin locations")
        void searchFlightsInvalidIata() {
            AiToolCall call = new AiToolCall("call-2", "searchFlights", Map.of(
                    "origin", "ZZ_UNKNOWN_LOC_99",
                    "destination", "NCE",
                    "departureDate", "2026-10-01"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).contains("invalide");
        }

        @Test
        @DisplayName("Resolves city names like Paris and Casablanca to IATA codes")
        void searchFlightsResolvesCityNames() throws Exception {
            com.fasterxml.jackson.databind.node.ObjectNode node = objectMapper.createObjectNode();
            node.putArray("items");
            when(travelClient.searchFlights(anyMap())).thenReturn(node);

            AiToolCall call = new AiToolCall("call-2b", "searchFlights", Map.of(
                    "origin", "Casablanca",
                    "destination", "Paris",
                    "departureDate", "2026-10-15"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData().get("origin")).isEqualTo("CMN");
            assertThat(result.getData().get("destination")).isEqualTo("CDG");
        }

        @Test
        @DisplayName("Rejects invalid departure date format")
        void searchFlightsInvalidDate() {
            AiToolCall call = new AiToolCall("call-3", "searchFlights", Map.of(
                    "origin", "CDG",
                    "destination", "NCE",
                    "departureDate", "01/10/2026"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).containsIgnoringCase("format de date").contains("YYYY-MM-DD");
        }
    }

    @Nested
    @DisplayName("searchHotels tool tests")
    class SearchHotelsTests {
        private SearchHotelsTool tool;

        @BeforeEach
        void setUp() {
            tool = new SearchHotelsTool(travelClient, 5);
        }

        @Test
        @DisplayName("Valid hotel search returns normalized hotel offers")
        void searchHotelsSuccess() throws Exception {
            String json = """
                    {
                      "items": [
                        {
                          "id": "HT-001",
                          "hotelName": "Grand Hotel Rome",
                          "city": "Rome",
                          "starRating": 4,
                          "pricePerNight": 150.00,
                          "totalPrice": 300.00,
                          "currency": "EUR"
                        }
                      ]
                    }
                    """;
            when(travelClient.searchHotels(anyMap())).thenReturn(objectMapper.readTree(json));

            AiToolCall call = new AiToolCall("call-4", "searchHotels", Map.of(
                    "destination", "Rome",
                    "checkIn", "2026-10-05",
                    "checkOut", "2026-10-07"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData()).containsKey("hotels");
            assertThat(result.getData().get("destination")).isEqualTo("Rome");
        }

        @Test
        @DisplayName("Rejects blank or too short destination")
        void searchHotelsInvalidDestination() {
            AiToolCall call = new AiToolCall("call-5", "searchHotels", Map.of(
                    "destination", "X",
                    "checkIn", "2026-10-05",
                    "checkOut", "2026-10-07"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).contains("trop courte");
        }
    }

    @Nested
    @DisplayName("getWeather tool tests")
    class GetWeatherTests {
        private GetWeatherTool tool;

        @BeforeEach
        void setUp() {
            tool = new GetWeatherTool(travelClient);
        }

        @Test
        @DisplayName("Resolves location name via geocoding and fetches weather")
        void getWeatherWithGeocoding() throws Exception {
            String geoJson = """
                    [
                      {
                        "name": "Marrakech",
                        "formatted": "Marrakech, Maroc",
                        "latitude": 31.6295,
                        "longitude": -7.9811
                      }
                    ]
                    """;
            String weatherJson = """
                    {
                      "temperatureUnit": "°C",
                      "windSpeedUnit": "km/h",
                      "current": {
                        "temperature": 26.5,
                        "apparentTemperature": 27.0,
                        "conditionLabel": "Ensoleillé",
                        "relativeHumidity": 35,
                        "windSpeed": 12.0
                      }
                    }
                    """;
            when(travelClient.geocode("Marrakech")).thenReturn(objectMapper.readTree(geoJson));
            when(travelClient.getWeather(eq(31.6295), eq(-7.9811), anyInt())).thenReturn(objectMapper.readTree(weatherJson));

            AiToolCall call = new AiToolCall("call-6", "getWeather", Map.of("location", "Marrakech"));
            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData().get("location")).isEqualTo("Marrakech, Maroc");
            assertThat(result.getData()).containsKey("current");
        }

        @Test
        @DisplayName("Returns error if location cannot be geocoded")
        void getWeatherGeocodingFailed() throws Exception {
            when(travelClient.geocode("UnknownPlace404")).thenReturn(objectMapper.readTree("[]"));

            AiToolCall call = new AiToolCall("call-7", "getWeather", Map.of("location", "UnknownPlace404"));
            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).contains("Impossible de localiser");
        }
    }

    @Nested
    @DisplayName("convertCurrency tool tests")
    class ConvertCurrencyTests {
        private ConvertCurrencyTool tool;

        @BeforeEach
        void setUp() {
            tool = new ConvertCurrencyTool(travelClient);
        }

        @Test
        @DisplayName("Valid currency conversion succeeds with BigDecimal precision")
        void convertCurrencySuccess() throws Exception {
            String json = """
                    {
                      "providerAmount": 100.0,
                      "providerCurrency": "EUR",
                      "displayAmount": 108.50,
                      "displayCurrency": "USD",
                      "exchangeRate": 1.085,
                      "exchangeRateDate": "2026-09-23"
                    }
                    """;
            when(travelClient.convertCurrency(any(BigDecimal.class), eq("EUR"), eq("USD")))
                    .thenReturn(objectMapper.readTree(json));

            AiToolCall call = new AiToolCall("call-8", "convertCurrency", Map.of(
                    "amount", 100,
                    "from", "EUR",
                    "to", "USD"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData().get("from")).isEqualTo("EUR");
            assertThat(result.getData().get("to")).isEqualTo("USD");
            assertThat(result.getData().get("exchangeRate")).isEqualTo(1.085);
        }

        @Test
        @DisplayName("Rejects non-positive or negative amounts")
        void convertCurrencyInvalidAmount() {
            AiToolCall call = new AiToolCall("call-9", "convertCurrency", Map.of(
                    "amount", -50,
                    "from", "EUR",
                    "to", "USD"
            ));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).contains("strictement positif");
        }
    }

    @Nested
    @DisplayName("getBookingStatus tool & IDOR Security tests")
    class GetBookingStatusTests {
        private GetBookingStatusTool tool;

        @BeforeEach
        void setUp() {
            tool = new GetBookingStatusTool(bookingClient);
        }

        @Test
        @DisplayName("Authenticated user querying owned booking receives minimized status")
        void getBookingStatusSuccess() throws Exception {
            String json = """
                    {
                      "bookingReference": "YUD-AB23CD45",
                      "userId": "11111111-1111-1111-1111-111111111111",
                      "status": "CONFIRMED",
                      "productType": "FLIGHT",
                      "secretCustomerEmail": "private@example.com"
                    }
                    """;
            when(bookingClient.getBookingByReference(eq("YUD-AB23CD45"), eq("valid-jwt-token")))
                    .thenReturn(objectMapper.readTree(json));

            AiToolExecutionContext context = new AiToolExecutionContext("valid-jwt-token", "11111111-1111-1111-1111-111111111111", Set.of("ROLE_USER"));
            AiToolCall call = new AiToolCall("call-10", "getBookingStatus", Map.of("bookingReference", "YUD-AB23CD45"));

            AiToolResult result = tool.execute(call, context);

            assertThat(result.isSuccess()).isTrue();
            assertThat(result.getData().get("bookingReference")).isEqualTo("YUD-AB23CD45");
            assertThat(result.getData().get("status")).isEqualTo("CONFIRMED");
            assertThat(result.getData().get("paid")).isEqualTo(true);
            // Verify PII is stripped / not exposed
            assertThat(result.getData()).doesNotContainKey("userId");
            assertThat(result.getData()).doesNotContainKey("secretCustomerEmail");
        }

        @Test
        @DisplayName("Unauthenticated caller is blocked immediately without downstream call")
        void getBookingStatusUnauthenticated() {
            AiToolCall call = new AiToolCall("call-11", "getBookingStatus", Map.of("bookingReference", "YUD-AB23CD45"));

            AiToolResult result = tool.execute(call, AiToolExecutionContext.anonymous());

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).contains("Authentification requise");
            verifyNoInteractions(bookingClient);
        }

        @Test
        @DisplayName("Cross-user IDOR access attempt is rejected with 403/404 from reservation-service")
        void getBookingStatusCrossUserIdorRejected() {
            when(bookingClient.getBookingByReference(eq("YUD-AB23CD45"), eq("attacker-jwt")))
                    .thenThrow(new HttpClientErrorException(HttpStatus.FORBIDDEN, "Access Denied"));

            AiToolExecutionContext context = new AiToolExecutionContext("attacker-jwt", "attacker-id", Set.of("ROLE_USER"));
            AiToolCall call = new AiToolCall("call-12", "getBookingStatus", Map.of("bookingReference", "YUD-AB23CD45"));

            AiToolResult result = tool.execute(call, context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).containsIgnoringCase("pas autorisé");
        }

        @Test
        @DisplayName("Rejects malformed booking reference format")
        void getBookingStatusInvalidReference() {
            AiToolExecutionContext context = new AiToolExecutionContext("token", "user", Set.of("ROLE_USER"));
            AiToolCall call = new AiToolCall("call-13", "getBookingStatus", Map.of("bookingReference", "INVALID-REF-999"));

            AiToolResult result = tool.execute(call, context);

            assertThat(result.isSuccess()).isFalse();
            assertThat(result.getErrorMessage()).contains("Référence de réservation invalide");
            verifyNoInteractions(bookingClient);
        }
    }
}
