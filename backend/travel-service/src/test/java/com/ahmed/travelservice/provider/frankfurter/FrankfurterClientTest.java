package com.ahmed.travelservice.provider.frankfurter;

import com.ahmed.travelservice.config.FrankfurterProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.frankfurter.FrankfurterClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class FrankfurterClientTest {
    private FrankfurterClient client;
    private MockRestServiceServer server;

    @BeforeEach
    void setUp() {
        FrankfurterProperties properties = new FrankfurterProperties();
        properties.setBaseUrl("https://api.frankfurter.dev");
        RestClient.Builder builder = RestClient.builder().baseUrl(properties.getBaseUrl());
        server = MockRestServiceServer.bindTo(builder).build();
        client = new FrankfurterClient(properties, builder.build());
    }

    @Test
    void callsCurrentV2PairEndpointAndParsesRateAsBigDecimal() {
        server.expect(request -> assertThat(request.getURI().getPath()).isEqualTo("/v2/rate/eur/mad"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("{\"date\":\"2026-09-18\",\"base\":\"EUR\",\"quote\":\"MAD\",\"rate\":\"10.81234\"}", MediaType.APPLICATION_JSON));

        var rate = client.getRate("EUR", "MAD");

        assertThat(rate.rate()).isEqualByComparingTo("10.81234");
        assertThat(rate.quote()).isEqualTo("MAD");
        server.verify();
    }

    @Test
    void mapsUnsupportedPairWithoutMakingAnyLiveCall() {
        server.expect(request -> assertThat(request.getURI().getPath()).isEqualTo("/v2/rate/xyz/mad"))
                .andRespond(withStatus(HttpStatus.UNPROCESSABLE_ENTITY));
        assertThatThrownBy(() -> client.getRate("XYZ", "MAD"))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_REQUEST_INVALID);
    }
}
