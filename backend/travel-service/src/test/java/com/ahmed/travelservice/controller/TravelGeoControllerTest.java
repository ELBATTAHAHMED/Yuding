package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.geo.GeoPlaceDto;
import com.ahmed.travelservice.dto.geo.NearbyPlaceDto;
import com.ahmed.travelservice.service.TravelGeoService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "spring.cloud.config.enabled=false",
        "eureka.client.enabled=false",
        "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration"
})
class TravelGeoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TravelGeoService geoService;

    @Test
    @DisplayName("GET /travel/geo/autocomplete returns 200 and place list without authentication")
    void autocomplete_returnsPlaces() throws Exception {
        GeoPlaceDto place = GeoPlaceDto.builder()
                .id("rak-1")
                .provider("GEOAPIFY")
                .name("Marrakech")
                .city("Marrakech")
                .country("Morocco")
                .countryCode("MA")
                .latitude(31.6258)
                .longitude(-7.9891)
                .build();

        when(geoService.autocomplete(any())).thenReturn(List.of(place));

        mockMvc.perform(get("/travel/geo/autocomplete")
                        .param("text", "Marrakech")
                        .param("type", "city"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name", is("Marrakech")))
                .andExpect(jsonPath("$[0].city", is("Marrakech")))
                .andExpect(jsonPath("$[0].countryCode", is("MA")))
                .andExpect(jsonPath("$[0].latitude", is(31.6258)))
                .andExpect(jsonPath("$[0].longitude", is(-7.9891)));
    }

    @Test
    @DisplayName("GET /travel/geo/geocode returns 200 and coordinates")
    void geocode_returnsCoordinates() throws Exception {
        GeoPlaceDto place = GeoPlaceDto.builder()
                .id("cdg-1")
                .name("Paris")
                .latitude(48.8566)
                .longitude(2.3522)
                .build();

        when(geoService.geocode(any())).thenReturn(List.of(place));

        mockMvc.perform(get("/travel/geo/geocode")
                        .param("text", "Paris"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].latitude", is(48.8566)))
                .andExpect(jsonPath("$[0].longitude", is(2.3522)));
    }

    @Test
    @DisplayName("GET /travel/geo/reverse returns structured place")
    void reverse_returnsPlace() throws Exception {
        GeoPlaceDto place = GeoPlaceDto.builder()
                .id("rev-1")
                .name("Medina")
                .city("Marrakech")
                .country("Morocco")
                .build();

        when(geoService.reverseGeocode(any())).thenReturn(place);

        mockMvc.perform(get("/travel/geo/reverse")
                        .param("lat", "31.6258")
                        .param("lon", "-7.9891"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name", is("Medina")))
                .andExpect(jsonPath("$.city", is("Marrakech")));
    }

    @Test
    @DisplayName("GET /travel/geo/places/nearby returns POI list with category and distance")
    void nearbyPlaces_returnsPOIs() throws Exception {
        NearbyPlaceDto poi = NearbyPlaceDto.builder()
                .id("poi-1")
                .name("Jardin Majorelle")
                .category("attractions")
                .formattedAddress("Rue Yves Saint Laurent, Marrakech")
                .distanceMeters(1200)
                .latitude(31.6417)
                .longitude(-8.0033)
                .build();

        when(geoService.findNearbyPlaces(any())).thenReturn(List.of(poi));

        mockMvc.perform(get("/travel/geo/places/nearby")
                        .param("lat", "31.6258")
                        .param("lon", "-7.9891")
                        .param("radius", "3000"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name", is("Jardin Majorelle")))
                .andExpect(jsonPath("$[0].category", is("attractions")))
                .andExpect(jsonPath("$[0].distanceMeters", is(1200)));
    }

    @Test
    @DisplayName("GET /travel/geo/map/static returns image/png bytes and cache headers")
    void staticMap_returnsPngBytes() throws Exception {
        byte[] fakePng = new byte[]{ (byte) 0x89, 'P', 'N', 'G' };
        when(geoService.getStaticMap(any())).thenReturn(fakePng);

        mockMvc.perform(get("/travel/geo/map/static")
                        .param("lat", "31.6258")
                        .param("lon", "-7.9891")
                        .param("zoom", "13"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andExpect(header().string("Cache-Control", containsString("max-age=86400")));
    }
}
