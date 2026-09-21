package com.ahmed.travelservice.provider.hbx;

import com.ahmed.travelservice.config.HBXProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.hbx.HBXActivitiesClient;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.HBXActivitySearchRequest;
import com.ahmed.travelservice.provider.impl.hbx.dto.activities.HBXActivitySearchResponse;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HBXActivitiesClientTest {

    private MockWebServer mockServer;
    private HBXActivitiesClient client;
    private HBXProperties properties;

    @BeforeEach
    void setUp() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        properties = new HBXProperties();
        properties.getActivities().setApiKey("test-act-api-key");
        properties.getActivities().setSecret("test-secret-456");
        properties.getActivities().setBaseUrl(mockServer.url("/").toString().replaceAll("/$", ""));
        properties.getActivities().setConnectTimeoutMs(2000);
        properties.getActivities().setReadTimeoutMs(3000);

        client = new HBXActivitiesClient(properties);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockServer.shutdown();
    }

    @Test
    @DisplayName("Sends authenticated POST to /activities with Api-key, X-Signature, and JSON payload")
    void searchActivities_sendsCorrectRequest() throws Exception {
        String mockJsonResponse = """
            {
              "operationId": "op-12345",
              "activities": [
                {
                  "code": "ACT-RAK-01",
                  "name": "Visite des Jardins Majorelle et Remparts",
                  "type": "TICKET",
                  "currency": "EUR",
                  "amountsFrom": [
                    { "amount": 28.50, "paxType": "ADULT" }
                  ],
                  "content": {
                    "description": "Découvrez le célèbre jardin bleu Majorelle à Marrakech.",
                    "media": {
                      "images": [
                        {
                          "urls": [
                            { "resource": "https://photos.hotelbeds.com/majorelle.jpg" }
                          ]
                        }
                      ]
                    }
                  }
                }
              ]
            }
            """;

        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(mockJsonResponse));

        HBXActivitySearchRequest request = HBXActivitySearchRequest.builder()
                .from("2026-10-01")
                .to("2026-10-05")
                .language("fr")
                .filters(List.of(
                        HBXActivitySearchRequest.FilterGroup.builder()
                                .searchFilterItems(List.of(
                                        HBXActivitySearchRequest.SearchFilterItem.builder()
                                                .type("destination")
                                                .value("RAK")
                                                .build()
                                ))
                                .build()
                ))
                .build();

        HBXActivitySearchResponse response = client.searchActivities(request);

        assertThat(response).isNotNull();
        assertThat(response.getActivities()).hasSize(1);
        assertThat(response.getActivities().get(0).getCode()).isEqualTo("ACT-RAK-01");
        assertThat(response.getActivities().get(0).getName()).contains("Majorelle");

        RecordedRequest recorded = mockServer.takeRequest(2, TimeUnit.SECONDS);
        assertThat(recorded).isNotNull();
        assertThat(recorded.getMethod()).isEqualTo("POST");
        assertThat(recorded.getPath()).isEqualTo("/activities");
        assertThat(recorded.getHeader("Api-key")).isEqualTo("test-act-api-key");
        assertThat(recorded.getHeader("X-Signature")).isNotNull().hasSize(64);
        assertThat(recorded.getBody().readUtf8()).contains("RAK");
    }

    @Test
    @DisplayName("Throws PROVIDER_AUTHENTICATION_FAILED on HTTP 401 or 403")
    void searchActivities_authFailed_throwsAuthenticationException() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(401)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"error\": {\"code\": \"401\", \"message\": \"Invalid signature\"}}"));

        HBXActivitySearchRequest request = HBXActivitySearchRequest.builder().build();

        assertThatThrownBy(() -> client.searchActivities(request))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException tpe = (TravelProviderException) e;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED);
                });
    }

    @Test
    @DisplayName("Throws PROVIDER_RATE_LIMITED on HTTP 429")
    void searchActivities_rateLimited_throwsRateLimitedException() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(429)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"error\": {\"code\": \"429\", \"message\": \"Quota exceeded\"}}"));

        HBXActivitySearchRequest request = HBXActivitySearchRequest.builder().build();

        assertThatThrownBy(() -> client.searchActivities(request))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException tpe = (TravelProviderException) e;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_RATE_LIMITED);
                });
    }

    @Test
    @DisplayName("Throws PROVIDER_UNAVAILABLE on HTTP 500")
    void searchActivities_serverError_throwsUnavailableException() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(500)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"error\": {\"code\": \"500\", \"message\": \"Internal system error\"}}"));

        HBXActivitySearchRequest request = HBXActivitySearchRequest.builder().build();

        assertThatThrownBy(() -> client.searchActivities(request))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException tpe = (TravelProviderException) e;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_UNAVAILABLE);
                });
    }

    @Test
    @DisplayName("Resolves global destination codes and city names dynamically")
    void resolveDestinationCode_resolvesGlobalDestinations() {
        // Direct 3-letter IATA / destination codes
        assertThat(HBXActivitiesClient.resolveDestinationCode("BCN")).isEqualTo("BCN");
        assertThat(HBXActivitiesClient.resolveDestinationCode("PAR")).isEqualTo("PAR");
        assertThat(HBXActivitiesClient.resolveDestinationCode("NYC")).isEqualTo("NYC");
        assertThat(HBXActivitiesClient.resolveDestinationCode("RAK")).isEqualTo("RAK");
        assertThat(HBXActivitiesClient.resolveDestinationCode("DXB")).isEqualTo("DXB");
        assertThat(HBXActivitiesClient.resolveDestinationCode("ROM")).isEqualTo("ROM");
        assertThat(HBXActivitiesClient.resolveDestinationCode("MAD")).isEqualTo("MAD");
        assertThat(HBXActivitiesClient.resolveDestinationCode("LON")).isEqualTo("LON");

        // Dynamic lookup from AirportDirectory
        assertThat(HBXActivitiesClient.resolveDestinationCode("Barcelona")).isEqualTo("BCN");
        assertThat(HBXActivitiesClient.resolveDestinationCode("Marrakech")).isEqualTo("RAK");
        assertThat(HBXActivitiesClient.resolveDestinationCode("Madrid")).isEqualTo("MAD");

        // Null / blank handling
        assertThat(HBXActivitiesClient.resolveDestinationCode(null)).isNull();
        assertThat(HBXActivitiesClient.resolveDestinationCode("")).isNull();
    }
}
