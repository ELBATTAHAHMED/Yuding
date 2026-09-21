package com.ahmed.travelservice.provider.hbx;

import com.ahmed.travelservice.config.HBXProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.hbx.HBXTransfersClient;
import com.ahmed.travelservice.provider.impl.hbx.dto.transfers.HBXTransferAvailabilityResponse;
import okhttp3.mockwebserver.MockResponse;
import okhttp3.mockwebserver.MockWebServer;
import okhttp3.mockwebserver.RecordedRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HBXTransfersClientTest {

    private MockWebServer mockServer;
    private HBXTransfersClient client;
    private HBXProperties properties;

    @BeforeEach
    void setUp() throws IOException {
        mockServer = new MockWebServer();
        mockServer.start();

        properties = new HBXProperties();
        properties.getTransfers().setApiKey("test-trf-api-key");
        properties.getTransfers().setSecret("test-secret-789");
        properties.getTransfers().setBaseUrl(mockServer.url("/").toString().replaceAll("/$", ""));
        properties.getTransfers().setConnectTimeoutMs(2000);
        properties.getTransfers().setReadTimeoutMs(3000);

        client = new HBXTransfersClient(properties);
    }

    @AfterEach
    void tearDown() throws IOException {
        mockServer.shutdown();
    }

    @Test
    @DisplayName("Sends authenticated GET to /availability with Api-key and X-Signature")
    void searchTransfers_sendsCorrectRequest() throws Exception {
        String mockJsonResponse = """
            {
              "services": [
                {
                  "id": "TRF-100",
                  "rateKey": "RK-RAK-PVT-01",
                  "transferType": "PRIVATE",
                  "vehicle": {
                    "code": "PVT-SEDAN",
                    "name": "Mercedes E-Class Privée"
                  },
                  "price": {
                    "totalAmount": 32.00,
                    "currencyId": "EUR"
                  },
                  "estimatedTime": {
                    "value": 25.0,
                    "metric": "MINUTES"
                  },
                  "pickupInformation": {
                    "from": { "description": "Aéroport Marrakech Menara (RAK)" },
                    "to": { "description": "Hivernage, Marrakech" }
                  }
                }
              ]
            }
            """;

        mockServer.enqueue(new MockResponse()
                .setResponseCode(200)
                .setHeader("Content-Type", "application/json")
                .setBody(mockJsonResponse));

        HBXTransferAvailabilityResponse response = client.searchTransfers(
                "fr",
                "IATA", "RAK",
                "GPS", "31.6295,-7.9811",
                LocalDate.of(2026, 10, 1),
                LocalTime.of(14, 0),
                2, 0, 0
        );

        assertThat(response).isNotNull();
        assertThat(response.getServices()).hasSize(1);
        assertThat(response.getServices().get(0).getTransferType()).isEqualTo("PRIVATE");
        assertThat(response.getServices().get(0).getVehicle().getName()).contains("Mercedes");

        RecordedRequest recorded = mockServer.takeRequest(2, TimeUnit.SECONDS);
        assertThat(recorded).isNotNull();
        assertThat(recorded.getMethod()).isEqualTo("GET");
        assertThat(recorded.getPath()).contains("/availability/fr/from/IATA/RAK/to/GPS/31.6295,-7.9811/2026-10-01T14:00:00/2/0/0");
        assertThat(recorded.getHeader("Api-key")).isEqualTo("test-trf-api-key");
        assertThat(recorded.getHeader("X-Signature")).isNotNull().hasSize(64);
    }

    @Test
    @DisplayName("Resolves Moroccan airport names and IATA codes correctly")
    void resolveOrigin_mapsAirportsAccurately() {
        assertThat(HBXTransfersClient.resolveOrigin("Marrakech Menara").code()).isEqualTo("RAK");
        assertThat(HBXTransfersClient.resolveOrigin("CMN").code()).isEqualTo("CMN");
        assertThat(HBXTransfersClient.resolveOrigin("Casablanca").code()).isEqualTo("CMN");
        assertThat(HBXTransfersClient.resolveOrigin("Agadir Al Massira").code()).isEqualTo("AGA");
        assertThat(HBXTransfersClient.resolveOrigin("Fes Saiss").code()).isEqualTo("FEZ");
        assertThat(HBXTransfersClient.resolveOrigin("Tangier Ibn Battouta").code()).isEqualTo("TNG");
    }

    @Test
    @DisplayName("Throws PROVIDER_AUTHENTICATION_FAILED on HTTP 401")
    void searchTransfers_authFailed_throwsAuthenticationException() {
        mockServer.enqueue(new MockResponse()
                .setResponseCode(401)
                .setHeader("Content-Type", "application/json")
                .setBody("{\"error\": {\"code\": \"401\", \"message\": \"Unauthorized\"}}"));

        assertThatThrownBy(() -> client.searchTransfers("fr", "IATA", "RAK", "GPS", "31.6295,-7.9811",
                LocalDate.now(), LocalTime.NOON, 2, 0, 0))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(e -> {
                    TravelProviderException tpe = (TravelProviderException) e;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED);
                });
    }
}
