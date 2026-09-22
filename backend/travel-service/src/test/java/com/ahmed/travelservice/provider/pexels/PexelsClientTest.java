package com.ahmed.travelservice.provider.pexels;

import com.ahmed.travelservice.config.PexelsProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.pexels.PexelsClient;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsPhoto;
import com.ahmed.travelservice.provider.impl.pexels.model.PexelsModels.PexelsSearchResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class PexelsClientTest {

    private PexelsProperties properties;
    private PexelsClient client;
    private MockRestServiceServer mockServer;

    @BeforeEach
    void setUp() {
        properties = new PexelsProperties();
        properties.setApiKey("mock-secret-pexels-key");
        properties.setBaseUrl("https://api.pexels.com");
        properties.setDestinationLimit(3);

        RestClient.Builder builder = RestClient.builder().baseUrl(properties.getBaseUrl());
        mockServer = MockRestServiceServer.bindTo(builder).build();

        client = new PexelsClient(properties, builder.build());
    }

    @Test
    @DisplayName("searchPhotos sends Authorization header, landscape orientation, and parses Photo objects")
    void searchPhotos_sendsAuthHeader_andParsesResponse() {
        String mockJsonResponse = """
                {
                  "total_results": 100,
                  "page": 1,
                  "per_page": 3,
                  "photos": [
                    {
                      "id": 123456,
                      "width": 3000,
                      "height": 2000,
                      "url": "https://www.pexels.com/photo/marrakech-sunset-123456/",
                      "photographer": "Karim Bennani",
                      "photographer_url": "https://www.pexels.com/@karim-bennani",
                      "photographer_id": 9876,
                      "avg_color": "#D4A373",
                      "src": {
                        "original": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg",
                        "large2x": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
                        "large": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&h=650&w=940",
                        "medium": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&h=350",
                        "small": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&h=130",
                        "portrait": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=1200&w=800",
                        "landscape": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=627&w=1200",
                        "tiny": "https://images.pexels.com/photos/123456/pexels-photo-123456.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280"
                      },
                      "alt": "Vue panoramique des toits de Marrakech au crépuscule"
                    }
                  ]
                }
                """;

        mockServer.expect(requestTo("https://api.pexels.com/v1/search?query=Marrakech%20Morocco%20travel&orientation=landscape&per_page=3&page=1"))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "mock-secret-pexels-key"))
                .andRespond(withSuccess(mockJsonResponse, MediaType.APPLICATION_JSON));

        PexelsSearchResponse response = client.searchPhotos("Marrakech Morocco travel", "landscape", 3, 1);

        assertThat(response).isNotNull();
        assertThat(response.getPhotos()).hasSize(1);

        PexelsPhoto photo = response.getPhotos().get(0);
        assertThat(photo.getId()).isEqualTo(123456L);
        assertThat(photo.getPhotographer()).isEqualTo("Karim Bennani");
        assertThat(photo.getPhotographerUrl()).isEqualTo("https://www.pexels.com/@karim-bennani");
        assertThat(photo.getUrl()).isEqualTo("https://www.pexels.com/photo/marrakech-sunset-123456/");
        assertThat(photo.getSrc().getLarge2x()).contains("images.pexels.com");
        assertThat(photo.getAlt()).isEqualTo("Vue panoramique des toits de Marrakech au crépuscule");

        mockServer.verify();
    }

    @Test
    @DisplayName("handles 401/403 as PROVIDER_AUTHENTICATION_FAILED")
    void handles_401_asAuthFailed() {
        mockServer.expect(requestTo("https://api.pexels.com/v1/search?query=Paris&orientation=landscape&per_page=3&page=1"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.searchPhotos("Paris", "landscape", 3, 1))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED);
    }

    @Test
    @DisplayName("handles 429 as PROVIDER_RATE_LIMITED")
    void handles_429_asRateLimited() {
        mockServer.expect(requestTo("https://api.pexels.com/v1/search?query=Paris&orientation=landscape&per_page=3&page=1"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.searchPhotos("Paris", "landscape", 3, 1))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_RATE_LIMITED);
    }

    @Test
    @DisplayName("handles 500 as PROVIDER_UNAVAILABLE")
    void handles_500_asProviderUnavailable() {
        mockServer.expect(requestTo("https://api.pexels.com/v1/search?query=Paris&orientation=landscape&per_page=3&page=1"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR));

        assertThatThrownBy(() -> client.searchPhotos("Paris", "landscape", 3, 1))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_UNAVAILABLE);
    }

    @Test
    @DisplayName("throws PROVIDER_NOT_CONFIGURED when API key is empty")
    void throws_whenApiKeyMissing() {
        properties.setApiKey("");
        assertThatThrownBy(() -> client.searchPhotos("Paris", "landscape", 3, 1))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_NOT_CONFIGURED);
    }

    @Test
    @DisplayName("throws PROVIDER_REQUEST_INVALID when query is blank")
    void throws_whenQueryBlank() {
        assertThatThrownBy(() -> client.searchPhotos("   ", "landscape", 3, 1))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_REQUEST_INVALID);
    }
}
