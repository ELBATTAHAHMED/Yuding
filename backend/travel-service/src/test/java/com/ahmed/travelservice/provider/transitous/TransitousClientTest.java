package com.ahmed.travelservice.provider.transitous;

import com.ahmed.travelservice.config.TransitousProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.transitous.TransitousClient;
import com.ahmed.travelservice.provider.impl.transitous.model.TransitousModels.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class TransitousClientTest {

    private TransitousProperties properties;
    private TransitousClient client;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        properties = new TransitousProperties();
        properties.setBaseUrl("https://api.transitous.org/api");
        properties.setUserAgent("Yuding/2.0 (https://ahmedelbattah.vercel.app)");

        RestClient.Builder restClientBuilder = RestClient.builder().baseUrl(properties.getBaseUrl());
        mockServer = MockRestServiceServer.bindTo(restClientBuilder).build();
        client = new TransitousClient(properties, restClientBuilder.build());
    }

    @Test
    @DisplayName("geocode sends required User-Agent header and parses stops and places")
    void geocode_sendsUserAgent_andParsesResponse() {
        String json = """
                [
                  {
                    "type": "STOP",
                    "name": "Paris Gare de Lyon",
                    "id": "ch-opentransportdataswiss26_Parent8768600",
                    "lat": 48.84484,
                    "lon": 2.37406,
                    "country": "FR",
                    "tz": "Europe/Paris",
                    "modes": ["HIGHSPEED_RAIL", "LONG_DISTANCE"],
                    "areas": [
                      {"name": "France", "adminLevel": 2.0},
                      {"name": "Paris", "adminLevel": 8.0, "default": true}
                    ]
                  }
                ]
                """;

        mockServer.expect(requestTo("https://api.transitous.org/api/v1/geocode?text=Paris&lang=fr"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("User-Agent", "Yuding/2.0 (https://ahmedelbattah.vercel.app)"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        List<GeocodeResult> results = client.geocode("Paris", "fr");

        assertThat(results).hasSize(1);
        GeocodeResult res = results.get(0);
        assertThat(res.getName()).isEqualTo("Paris Gare de Lyon");
        assertThat(res.getType()).isEqualTo("STOP");
        assertThat(res.getCountry()).isEqualTo("FR");
        assertThat(res.getLat()).isEqualTo(48.84484);
        assertThat(res.getLon()).isEqualTo(2.37406);
        assertThat(res.getModes()).contains("HIGHSPEED_RAIL");
        mockServer.verify();
    }

    @Test
    @DisplayName("plan sends required query params and User-Agent, parses itineraries and legs")
    void plan_sendsRequiredParams_andParsesResponse() {
        String json = """
                {
                  "itineraries": [
                    {
                      "duration": 7200,
                      "startTime": "2026-09-22T08:00:00Z",
                      "endTime": "2026-09-22T10:00:00Z",
                      "transfers": 0,
                      "legs": [
                        {
                          "mode": "HIGHSPEED_RAIL",
                          "agencyName": "SNCF Voyageurs",
                          "agencyUrl": "https://www.sncf-connect.com",
                          "displayName": "TGV INOUI 6605",
                          "startTime": "2026-09-22T08:00:00Z",
                          "endTime": "2026-09-22T10:00:00Z",
                          "duration": 7200,
                          "realTime": true,
                          "from": {
                            "name": "Paris Gare de Lyon",
                            "lat": 48.84484,
                            "lon": 2.37406
                          },
                          "to": {
                            "name": "Lyon Part-Dieu",
                            "lat": 45.7604,
                            "lon": 4.8596
                          },
                          "intermediateStops": [
                            {
                              "name": "Le Creusot TGV",
                              "arrival": "2026-09-22T09:10:00Z",
                              "departure": "2026-09-22T09:12:00Z"
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.transitous.org/api/v6/plan?fromPlace=48.84484,2.37406&toPlace=45.7604,4.8596&numItineraries=3&transitModes=LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL&timetableView=true&arriveBy=false&time=2026-09-22T08:00:00Z"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header("User-Agent", "Yuding/2.0 (https://ahmedelbattah.vercel.app)"))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        PlanResponse response = client.plan("48.84484,2.37406", "45.7604,4.8596", "2026-09-22T08:00:00Z", 3,
                "LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL");

        assertThat(response).isNotNull();
        assertThat(response.getItineraries()).hasSize(1);
        Itinerary itin = response.getItineraries().get(0);
        assertThat(itin.getDuration()).isEqualTo(7200L);
        assertThat(itin.getTransfers()).isEqualTo(0);
        assertThat(itin.getLegs()).hasSize(1);

        Leg leg = itin.getLegs().get(0);
        assertThat(leg.getMode()).isEqualTo("HIGHSPEED_RAIL");
        assertThat(leg.getAgencyName()).isEqualTo("SNCF Voyageurs");
        assertThat(leg.getDisplayName()).isEqualTo("TGV INOUI 6605");
        assertThat(leg.getRealTime()).isTrue();
        assertThat(leg.getIntermediateStops()).hasSize(1);
        mockServer.verify();
    }

    @Test
    @DisplayName("plan throws rateLimitExceeded on HTTP 429")
    void plan_handlesRateLimit429() {
        mockServer.expect(requestTo("https://api.transitous.org/api/v6/plan?fromPlace=A&toPlace=B&numItineraries=5&transitModes=LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL,SUBWAY,TRAM&timetableView=true&arriveBy=false"))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.plan("A", "B", null, 5, null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(ex -> {
                    TravelProviderException tpe = (TravelProviderException) ex;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_RATE_LIMITED);
                });
        mockServer.verify();
    }

    @Test
    @DisplayName("plan throws badRequest on HTTP 400")
    void plan_handlesBadRequest400() {
        mockServer.expect(requestTo("https://api.transitous.org/api/v6/plan?fromPlace=A&toPlace=B&numItineraries=5&transitModes=LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL,SUBWAY,TRAM&timetableView=true&arriveBy=false"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST));

        assertThatThrownBy(() -> client.plan("A", "B", null, 5, null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(ex -> {
                    TravelProviderException tpe = (TravelProviderException) ex;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_REQUEST_INVALID);
                });
        mockServer.verify();
    }

    @Test
    @DisplayName("plan throws providerUnavailable on HTTP 500")
    void plan_handlesServerError500() {
        mockServer.expect(requestTo("https://api.transitous.org/api/v6/plan?fromPlace=A&toPlace=B&numItineraries=5&transitModes=LONG_DISTANCE,HIGHSPEED_RAIL,REGIONAL_RAIL,RAIL,SUBWAY,TRAM&timetableView=true&arriveBy=false"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.plan("A", "B", null, 5, null))
                .isInstanceOf(TravelProviderException.class)
                .satisfies(ex -> {
                    TravelProviderException tpe = (TravelProviderException) ex;
                    assertThat(tpe.getErrorCode()).isEqualTo(ProviderErrorCode.PROVIDER_UNAVAILABLE);
                });
        mockServer.verify();
    }
}
