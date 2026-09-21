package com.ahmed.travelservice.provider.transitland;

import com.ahmed.travelservice.config.TransitlandProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitland.TransitlandClient;
import com.ahmed.travelservice.provider.impl.transitland.dto.TransitlandModels;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TransitlandClientTest {

    private TransitlandProperties properties;
    private TransitlandClient client;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        properties = new TransitlandProperties();
        properties.setApiKey("test-transitland-key");
        properties.setBaseUrl("https://transit.land/api/v2/rest");

        RestClient.Builder restClientBuilder = RestClient.builder().baseUrl(properties.getBaseUrl());
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        client = new TransitlandClient(properties, restClientBuilder.build());
    }

    @Test
    @DisplayName("getFeedVersion sends apikey header and parses feed validity")
    void getFeedVersion_sendsAuthHeader_andParsesResponse() {
        String json = """
                {
                  "feeds": [
                    {
                      "id": 9784,
                      "onestop_id": "f-oncf~morocco~rail",
                      "feed_versions": [
                        {
                          "id": 631571,
                          "earliest_calendar_date": "2024-01-01",
                          "latest_calendar_date": "2025-12-31",
                          "fetched_at": "2026-01-24T02:03:29Z"
                        }
                      ]
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://transit.land/api/v2/rest/feeds/f-oncf~morocco~rail"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("apikey", "test-transitland-key"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        TransitlandModels.FeedVersion version = client.getFeedVersion("f-oncf~morocco~rail");

        assertThat(version).isNotNull();
        assertThat(version.getEarliestCalendarDate()).isEqualTo("2024-01-01");
        assertThat(version.getLatestCalendarDate()).isEqualTo("2025-12-31");
        mockServer.verify();
    }

    @Test
    @DisplayName("getStops parses station stops and coordinates")
    void getStops_parsesStations() {
        String json = """
                {
                  "stops": [
                    {
                      "id": 1,
                      "onestop_id": "s-evfx4s7cyn-casa~voyageurs",
                      "stop_id": "CASA_VOYAGEURS",
                      "stop_name": "Casa-Voyageurs",
                      "geometry": { "type": "Point", "coordinates": [-7.6191, 33.5979] }
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://transit.land/api/v2/rest/stops?feed_onestop_id=f-oncf~morocco~rail&limit=100"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("apikey", "test-transitland-key"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        List<TransitlandModels.StopItem> stops = client.getStops("f-oncf~morocco~rail");

        assertThat(stops).hasSize(1);
        assertThat(stops.getFirst().getStopName()).isEqualTo("Casa-Voyageurs");
        mockServer.verify();
    }

    @Test
    @DisplayName("401 Unauthorized maps to PROVIDER_AUTHENTICATION_FAILED")
    void authFailure_throwsAuthenticationFailed() {
        mockServer.expect(requestTo("https://transit.land/api/v2/rest/feeds/f-oncf~morocco~rail"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.getFeedVersion("f-oncf~morocco~rail"))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED);
                });

        mockServer.verify();
    }

    @Test
    @DisplayName("429 Too Many Requests maps to PROVIDER_RATE_LIMITED")
    void rateLimit_throwsRateLimited() {
        mockServer.expect(requestTo("https://transit.land/api/v2/rest/stops?feed_onestop_id=f-oncf~morocco~rail&limit=100"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.getStops("f-oncf~morocco~rail"))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_RATE_LIMITED);
                });

        mockServer.verify();
    }

    @Test
    @DisplayName("503 Service Unavailable maps to PROVIDER_UNAVAILABLE")
    void serverError_throwsProviderUnavailable() {
        mockServer.expect(requestTo("https://transit.land/api/v2/rest/stops/s-evfx4s7cyn-casa~voyageurs/departures?date=2025-05-15&use_service_window=false&limit=100"))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.getStopDepartures("s-evfx4s7cyn-casa~voyageurs", LocalDate.parse("2025-05-15")))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException te = (TravelProviderException) e;
                    assertThat(te.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_UNAVAILABLE);
                });

        mockServer.verify();
    }
}
