package com.ahmed.travelservice.provider.geoapify;

import com.ahmed.travelservice.config.GeoapifyProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.geoapify.GeoapifyClient;
import com.ahmed.travelservice.provider.impl.geoapify.model.GeoapifyModels.FeatureCollection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeoapifyClientTest {

    private GeoapifyProperties properties;
    private GeoapifyClient client;
    private MockRestServiceServer mockApiServer;
    private MockRestServiceServer mockMapsServer;

    @BeforeEach
    void setUp() {
        properties = new GeoapifyProperties();
        properties.setApiKey("mock-secret-test-key");
        properties.setBaseUrl("https://api.geoapify.com");
        properties.setMapsBaseUrl("https://maps.geoapify.com");

        RestClient.Builder apiBuilder = RestClient.builder().baseUrl(properties.getBaseUrl());
        mockApiServer = MockRestServiceServer.bindTo(apiBuilder).build();

        RestClient.Builder mapsBuilder = RestClient.builder().baseUrl(properties.getMapsBaseUrl());
        mockMapsServer = MockRestServiceServer.bindTo(mapsBuilder).build();

        client = new GeoapifyClient(properties, apiBuilder.build(), mapsBuilder.build());
    }

    @Test
    @DisplayName("autocomplete sends correct parameters and parses GeoJSON features")
    void autocomplete_sendsParams_andParsesFeatures() {
        String json = """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "place_id": "geo-rak-1",
                        "name": "Marrakech",
                        "city": "Marrakesh",
                        "state": "Marrakesh-Safi",
                        "country": "Morocco",
                        "country_code": "ma",
                        "formatted": "Marrakech, Marrakesh-Safi, Morocco",
                        "result_type": "city",
                        "lat": 31.6258,
                        "lon": -7.9891
                      },
                      "geometry": {
                        "type": "Point",
                        "coordinates": [-7.9891, 31.6258]
                      }
                    }
                  ]
                }
                """;

        mockApiServer.expect(requestTo("https://api.geoapify.com/v1/geocode/autocomplete?text=Marr&lang=en&limit=8&apiKey=mock-secret-test-key&type=city&filter=countrycode:ma"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        FeatureCollection fc = client.autocomplete("Marr", "city", "en", "ma", 8, null, null);

        assertThat(fc.getFeatures()).hasSize(1);
        var prop = fc.getFeatures().get(0).getProperties();
        assertThat(prop.getCity()).isEqualTo("Marrakesh");
        assertThat(prop.getCountryCode()).isEqualTo("ma");
        assertThat(prop.getLat()).isEqualTo(31.6258);
        assertThat(prop.getLon()).isEqualTo(-7.9891);
        mockApiServer.verify();
    }

    @Test
    @DisplayName("geocode sends correct parameters and parses coordinates")
    void geocode_sendsParams_andParsesFeatures() {
        String json = """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "place_id": "geo-paris-1",
                        "name": "Paris",
                        "city": "Paris",
                        "country": "France",
                        "country_code": "fr",
                        "formatted": "Paris, France",
                        "lat": 48.8566,
                        "lon": 2.3522
                      }
                    }
                  ]
                }
                """;

        mockApiServer.expect(requestTo("https://api.geoapify.com/v1/geocode/search?text=Paris&lang=en&limit=5&apiKey=mock-secret-test-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        FeatureCollection fc = client.geocode("Paris", "en", null, 5);

        assertThat(fc.getFeatures()).hasSize(1);
        assertThat(fc.getFeatures().get(0).getProperties().getName()).isEqualTo("Paris");
        assertThat(fc.getFeatures().get(0).getProperties().getLat()).isEqualTo(48.8566);
        mockApiServer.verify();
    }

    @Test
    @DisplayName("reverse geocode parses nearest structured place")
    void reverseGeocode_sendsCoordinates_andParsesResult() {
        String json = """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "place_id": "geo-rev-1",
                        "name": "Jemaa el-Fna",
                        "city": "Marrakesh",
                        "country": "Morocco",
                        "country_code": "ma",
                        "lat": 31.6258,
                        "lon": -7.9891
                      }
                    }
                  ]
                }
                """;

        mockApiServer.expect(requestTo("https://api.geoapify.com/v1/geocode/reverse?lat=31.6258&lon=-7.9891&lang=en&apiKey=mock-secret-test-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        FeatureCollection fc = client.reverseGeocode(31.6258, -7.9891, "en");

        assertThat(fc.getFeatures()).hasSize(1);
        assertThat(fc.getFeatures().get(0).getProperties().getName()).isEqualTo("Jemaa el-Fna");
        mockApiServer.verify();
    }

    @Test
    @DisplayName("findPlaces parses nearby POIs with categories and distance")
    void findPlaces_sendsCircleFilter_andParsesPOIs() {
        String json = """
                {
                  "type": "FeatureCollection",
                  "features": [
                    {
                      "type": "Feature",
                      "properties": {
                        "place_id": "poi-1",
                        "name": "Louvre Museum",
                        "categories": ["entertainment.museum", "tourism.sights"],
                        "formatted": "Rue de Rivoli, Paris, France",
                        "distance": 350,
                        "lat": 48.8606,
                        "lon": 2.3376
                      }
                    }
                  ]
                }
                """;

        mockApiServer.expect(requestTo("https://api.geoapify.com/v2/places?categories=entertainment.museum&filter=circle:2.3522,48.8566,3000&bias=proximity:2.3522,48.8566&limit=10&lang=en&apiKey=mock-secret-test-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(json, MediaType.APPLICATION_JSON));

        FeatureCollection fc = client.findPlaces(48.8566, 2.3522, 3000, "entertainment.museum", 10, "en");

        assertThat(fc.getFeatures()).hasSize(1);
        var p = fc.getFeatures().get(0).getProperties();
        assertThat(p.getName()).isEqualTo("Louvre Museum");
        assertThat(p.getDistance()).isEqualTo(350);
        assertThat(p.getCategories()).contains("entertainment.museum");
        mockApiServer.verify();
    }

    @Test
    @DisplayName("getStaticMap returns image byte array")
    void getStaticMap_returnsImageBytes() {
        byte[] fakePng = new byte[]{ (byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10 };

        mockMapsServer.expect(requestTo("https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=400&center=lonlat:2.3522,48.8566&zoom=14&apiKey=mock-secret-test-key&marker=lonlat:2.3522,48.8566"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess(fakePng, MediaType.IMAGE_PNG));

        byte[] result = client.getStaticMap(48.8566, 2.3522, 14, 600, 400, null);

        assertThat(result).isEqualTo(fakePng);
        mockMapsServer.verify();
    }

    @Test
    @DisplayName("handles 401/403 as PROVIDER_AUTHENTICATION_FAILED")
    void handles_401_asAuthFailed() {
        mockApiServer.expect(requestTo("https://api.geoapify.com/v1/geocode/autocomplete?text=Paris&lang=en&limit=8&apiKey=mock-secret-test-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED));

        assertThatThrownBy(() -> client.autocomplete("Paris", null, "en", null, 8, null, null))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_AUTHENTICATION_FAILED);
    }

    @Test
    @DisplayName("handles 429 as PROVIDER_RATE_LIMITED")
    void handles_429_asRateLimited() {
        mockApiServer.expect(requestTo("https://api.geoapify.com/v1/geocode/autocomplete?text=Paris&lang=en&limit=8&apiKey=mock-secret-test-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.TOO_MANY_REQUESTS));

        assertThatThrownBy(() -> client.autocomplete("Paris", null, "en", null, 8, null, null))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_RATE_LIMITED);
    }

    @Test
    @DisplayName("handles 500/503 as PROVIDER_UNAVAILABLE")
    void handles_500_asUnavailable() {
        mockApiServer.expect(requestTo("https://api.geoapify.com/v1/geocode/autocomplete?text=Paris&lang=en&limit=8&apiKey=mock-secret-test-key"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(HttpStatus.SERVICE_UNAVAILABLE));

        assertThatThrownBy(() -> client.autocomplete("Paris", null, "en", null, 8, null, null))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_UNAVAILABLE);
    }

    @Test
    @DisplayName("throws PROVIDER_NOT_CONFIGURED when API key is missing")
    void throwsNotConfigured_whenKeyIsMissing() {
        properties.setApiKey("");
        assertThatThrownBy(() -> client.autocomplete("Paris", null, "en", null, 8, null, null))
                .isInstanceOf(TravelProviderException.class)
                .hasFieldOrPropertyWithValue("errorCode", ProviderErrorCode.PROVIDER_NOT_CONFIGURED);
    }
}
