package com.ahmed.travelservice.provider.nuitee;

import com.ahmed.travelservice.config.NuiteeProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.nuitee.NuiteeClient;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeOccupancy;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRatesRequest;
import com.ahmed.travelservice.provider.impl.nuitee.dto.NuiteeRatesResponse;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class NuiteeClientTest {

    private MockWebServer mockServer;
    private NuiteeClient client;

    @BeforeEach
    void setUp() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        NuiteeProperties props = new NuiteeProperties();
        props.setApiKey("test-sandbox-key-secret");
        props.setBaseUrl(mockServer.url("/").toString().replaceAll("/$", ""));
        props.setConnectTimeoutMs(2000);
        props.setReadTimeoutMs(3000);

        client = new NuiteeClient(props);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockServer.shutdown();
    }

    @Test
    @DisplayName("Sends authenticated POST to /hotels/rates with correct X-API-Key and payload")
    void searchHotelRates_sendsCorrectRequest() throws Exception {
        String mockJsonResponse = """
            {
              "data": [
                {
                  "hotelId": "lp1897",
                  "roomTypes": [
                    {
                      "roomTypeId": "rt_king_1",
                      "offerId": "GE5ESNB_TEST_OFFER_ID",
                      "rates": [
                        {
                          "rateId": "rate_123",
                          "name": "Standard King Room",
                          "boardType": "RO",
                          "boardName": "Room Only",
                          "maxOccupancy": 2,
                          "adultCount": 2,
                          "childCount": 0,
                          "retailRate": {
                            "total": [
                              {
                                "amount": 163.66,
                                "currency": "EUR"
                              }
                            ]
                          },
                          "cancellationPolicies": {
                            "refundableTag": "RFN",
                            "cancelPolicyInfos": [
                              {
                                "cancelTime": "2026-07-30 02:00:00",
                                "amount": 163.66,
                                "currency": "EUR"
                              }
                            ]
                          }
                        }
                      ]
                    }
                  ]
                }
              ],
              "sandbox": true,
              "hotels": [
                {
                  "id": "lp1897",
                  "name": "Atlas Hotel Marrakech",
                  "city_name": "Marrakech",
                  "country_code": "MA",
                  "stars": 4.5,
                  "rating": 8.8,
                  "review_count": 120,
                  "main_photo": "https://images.example.com/hotel.jpg"
                }
              ]
            }
            """;

        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(mockJsonResponse));

        NuiteeRatesRequest request = NuiteeRatesRequest.builder()
                .checkin("2026-10-15")
                .checkout("2026-10-18")
                .currency("EUR")
                .guestNationality("MA")
                .cityName("Marrakech")
                .countryCode("MA")
                .occupancies(List.of(NuiteeOccupancy.builder().adults(2).children(List.of()).rooms(1).build()))
                .build();

        NuiteeRatesResponse response = client.searchHotelRates(request);

        assertThat(response).isNotNull();
        assertThat(response.getData()).hasSize(1);
        assertThat(response.getData().get(0).getHotelId()).isEqualTo("lp1897");
        assertThat(response.getData().get(0).getRoomTypes().get(0).getOfferId()).isEqualTo("GE5ESNB_TEST_OFFER_ID");
        assertThat(response.getHotels()).hasSize(1);
        assertThat(response.getHotels().get(0).getName()).isEqualTo("Atlas Hotel Marrakech");

        RecordedRequest recorded = mockServer.takeRequest(2, TimeUnit.SECONDS);
        assertThat(recorded).isNotNull();
        assertThat(recorded.getMethod()).isEqualTo("POST");
        assertThat(recorded.getPath()).isEqualTo("/hotels/rates");
        assertThat(recorded.getHeader("X-API-Key")).isEqualTo("test-sandbox-key-secret");
        assertThat(recorded.getBody().readUtf8()).contains("\"cityName\":\"Marrakech\"", "\"countryCode\":\"MA\"");
    }

    @Test
    @DisplayName("Maps 401 Unauthorized to PROVIDER_AUTHENTICATION_FAILED")
    void searchHotelRates_401ThrowsAuthenticationFailed() {
        mockServer.enqueue(new MockResponse().setResponseCode(401).setBody("{\"error\":{\"code\":401,\"message\":\"Unauthorized\"}}"));

        NuiteeRatesRequest request = NuiteeRatesRequest.builder()
                .checkin("2026-10-15").checkout("2026-10-18").build();

        assertThatThrownBy(() -> client.searchHotelRates(request))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED);
                });
    }

    @Test
    @DisplayName("Maps 429 Rate Limit to PROVIDER_RATE_LIMITED")
    void searchHotelRates_429ThrowsRateLimited() {
        mockServer.enqueue(new MockResponse().setResponseCode(429).setBody("{\"error\":{\"code\":429,\"message\":\"Too Many Requests\"}}"));

        NuiteeRatesRequest request = NuiteeRatesRequest.builder()
                .checkin("2026-10-15").checkout("2026-10-18").build();

        assertThatThrownBy(() -> client.searchHotelRates(request))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_RATE_LIMITED);
                });
    }

    @Test
    @DisplayName("Maps 500 Server Error to PROVIDER_UNAVAILABLE")
    void searchHotelRates_500ThrowsUnavailable() {
        mockServer.enqueue(new MockResponse().setResponseCode(500).setBody("Internal Server Error"));

        NuiteeRatesRequest request = NuiteeRatesRequest.builder()
                .checkin("2026-10-15").checkout("2026-10-18").build();

        assertThatThrownBy(() -> client.searchHotelRates(request))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_UNAVAILABLE);
                });
    }

    @Test
    @DisplayName("Normalizes business error with no availability into empty response")
    void searchHotelRates_businessErrorNoAvailabilityReturnsEmpty() {
        String mockJsonResponse = """
            {
              "data": [],
              "error": {
                "code": 2004,
                "message": "no rates available for selected dates",
                "description": "no availability found"
              }
            }
            """;

        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(mockJsonResponse));

        NuiteeRatesRequest request = NuiteeRatesRequest.builder()
                .checkin("2026-10-15").checkout("2026-10-18").build();

        NuiteeRatesResponse response = client.searchHotelRates(request);
        assertThat(response.getData()).isEmpty();
    }
}
