package com.ahmed.travelservice.cache;

import com.ahmed.travelservice.currency.CurrencyProvider;
import com.ahmed.travelservice.currency.ExchangeRateQuote;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.dto.geo.GeoAutocompleteRequest;
import com.ahmed.travelservice.dto.geo.GeoPlaceDto;
import com.ahmed.travelservice.dto.image.DestinationImageRequest;
import com.ahmed.travelservice.dto.image.DestinationImagesResponseDto;
import com.ahmed.travelservice.dto.image.ImageAssetDto;
import com.ahmed.travelservice.dto.image.ImageRole;
import com.ahmed.travelservice.dto.image.ImageSourceType;
import com.ahmed.travelservice.dto.request.FlightSearchRequest;
import com.ahmed.travelservice.dto.request.RevalidateOfferRequest;
import com.ahmed.travelservice.dto.response.FlightOfferDto;
import com.ahmed.travelservice.dto.response.OfferRevalidationResult;
import com.ahmed.travelservice.dto.response.SearchResponse;
import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.TravelProduct;
import com.ahmed.travelservice.provider.TravelProvider;
import com.ahmed.travelservice.provider.TravelProviderRegistry;
import com.ahmed.travelservice.provider.geo.GeoProvider;
import com.ahmed.travelservice.provider.impl.pexels.PexelsImageProvider;
import com.ahmed.travelservice.provider.weather.WeatherProvider;
import com.ahmed.travelservice.service.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Phase 30 Domain Caching Integration Tests (Zero Live Calls)")
class DomainCachingIntegrationTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private ValueOperations<String, String> valueOperations;

    @Mock
    private GeoProvider geoProvider;

    @Mock
    private WeatherProvider weatherProvider;

    @Mock
    private CurrencyProvider currencyProvider;

    @Mock
    private PexelsImageProvider pexelsImageProvider;

    @Mock
    private TravelProviderRegistry providerRegistry;

    @Mock
    private TravelProvider flightProvider;

    private ObjectMapper objectMapper;
    private ExternalApiCacheProperties cacheProperties;
    private RedisExternalApiCache cache;
    private Map<String, String> inMemoryStore;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        cacheProperties = new ExternalApiCacheProperties();
        cacheProperties.setEnabled(true);

        inMemoryStore = new HashMap<>();

        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);

        // Simulate real Redis in-memory storage behavior for integration tests
        lenient().when(valueOperations.get(anyString())).thenAnswer(invocation -> inMemoryStore.get(invocation.getArgument(0)));
        lenient().doAnswer(invocation -> {
            inMemoryStore.put(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(valueOperations).set(anyString(), anyString(), any(Duration.class));

        cache = new RedisExternalApiCache(redisTemplate, objectMapper, cacheProperties);
    }

    @Test
    @DisplayName("Geo Autocomplete: second identical request served from cache, Geoapify called once")
    void testGeoAutocompleteCaching() {
        when(geoProvider.getMetadata()).thenReturn(ProviderMetadata.builder().providerCode("GEOAPIFY").displayName("Geoapify").build());

        GeoPlaceDto mockPlace = GeoPlaceDto.builder().formatted("Marrakech, Morocco").city("Marrakech").build();
        when(geoProvider.autocomplete(any())).thenReturn(List.of(mockPlace));

        TravelGeoService geoService = new TravelGeoService(geoProvider, cache, cacheProperties);

        GeoAutocompleteRequest req = GeoAutocompleteRequest.builder().text("Marrakech").build();

        // 1st request -> MISS -> provider called
        List<GeoPlaceDto> res1 = geoService.autocomplete(req);
        assertEquals(1, res1.size());
        verify(geoProvider, times(1)).autocomplete(any());

        // 2nd identical request -> HIT -> provider NOT called again
        List<GeoPlaceDto> res2 = geoService.autocomplete(req);
        assertEquals(1, res2.size());
        verify(geoProvider, times(1)).autocomplete(any());
    }

    @Test
    @DisplayName("Weather: second identical request served from cache, Open-Meteo called once, timezone preserved")
    void testWeatherCaching() {
        when(weatherProvider.getMetadata()).thenReturn(ProviderMetadata.builder().providerCode("OPEN_METEO").displayName("Open-Meteo").build());

        WeatherResponseDto mockWeather = WeatherResponseDto.builder()
                .latitude(31.63)
                .longitude(-7.98)
                .timezone("Africa/Casablanca")
                .temperatureUnit("celsius")
                .build();
        when(weatherProvider.getWeather(anyDouble(), anyDouble(), anyInt())).thenReturn(mockWeather);

        com.ahmed.travelservice.config.OpenMeteoProperties meteoProps = new com.ahmed.travelservice.config.OpenMeteoProperties();
        meteoProps.setForecastDays(7);
        WeatherService weatherService = new WeatherService(weatherProvider, meteoProps, cache, cacheProperties);

        // 1st request -> provider called
        WeatherResponseDto w1 = weatherService.getWeather(31.6295, -7.9811, 7);
        assertNotNull(w1);
        assertEquals("Africa/Casablanca", w1.getTimezone());
        verify(weatherProvider, times(1)).getWeather(anyDouble(), anyDouble(), anyInt());

        // 2nd request -> cached, provider NOT called
        WeatherResponseDto w2 = weatherService.getWeather(31.6295, -7.9811, 7);
        assertNotNull(w2);
        assertEquals("Africa/Casablanca", w2.getTimezone());
        verify(weatherProvider, times(1)).getWeather(anyDouble(), anyDouble(), anyInt());
    }

    @Test
    @DisplayName("Currency: EUR->MAD calls Frankfurter once, MAD->MAD does 0 calls (identity)")
    void testCurrencyCaching() {
        when(currencyProvider.getProviderCode()).thenReturn("FRANKFURTER");

        ExchangeRateQuote eurQuote = new ExchangeRateQuote("EUR", "MAD", new BigDecimal("10.8542"), LocalDate.of(2026, 9, 21), "FRANKFURTER");
        when(currencyProvider.getExchangeRate("EUR", "MAD")).thenReturn(eurQuote);

        com.ahmed.travelservice.config.CurrencyProperties currProps = new com.ahmed.travelservice.config.CurrencyProperties();
        currProps.setDisplayCurrency("MAD");
        CurrencyService currencyService = new CurrencyService(currencyProvider, currProps, cache, cacheProperties);

        // 1st call EUR -> MAD
        ExchangeRateQuote q1 = currencyService.getExchangeRate("EUR", "MAD");
        assertEquals(new BigDecimal("10.8542"), q1.rate());
        verify(currencyProvider, times(1)).getExchangeRate("EUR", "MAD");

        // 2nd call EUR -> MAD (from cache)
        ExchangeRateQuote q2 = currencyService.getExchangeRate("EUR", "MAD");
        assertEquals(new BigDecimal("10.8542"), q2.rate());
        verify(currencyProvider, times(1)).getExchangeRate("EUR", "MAD");

        // Identity conversion MAD -> MAD: zero provider calls!
        ExchangeRateQuote identityQuote = currencyService.getExchangeRate("MAD", "MAD");
        assertEquals(BigDecimal.ONE, identityQuote.rate());
        assertEquals("IDENTITY", identityQuote.providerCode());
        verify(currencyProvider, never()).getExchangeRate("MAD", "MAD");
    }

    @Test
    @DisplayName("Destination Images: Pexels called once, photographer attribution survives cache")
    void testDestinationImagesCaching() {
        when(pexelsImageProvider.getProviderCode()).thenReturn("PEXELS");

        ImageAssetDto asset = ImageAssetDto.builder()
                .id("pexels-100")
                .url("https://images.pexels.com/photos/100/img.jpg")
                .photographerName("Karim Bennani")
                .attributionText("Photo par Karim Bennani sur Pexels")
                .sourceType(ImageSourceType.STOCK_DESTINATION)
                .role(ImageRole.DESTINATION_HERO)
                .representsEntity(false)
                .build();

        when(pexelsImageProvider.getDestinationImages(any())).thenReturn(List.of(asset));

        ImageService imageService = new ImageService(pexelsImageProvider, cache, cacheProperties);
        DestinationImageRequest req = DestinationImageRequest.builder().city("Marrakech").country("Morocco").build();

        // 1st call -> provider called
        DestinationImagesResponseDto res1 = imageService.getDestinationImages(req);
        assertEquals(1, res1.getCount());
        assertEquals("Karim Bennani", res1.getImages().get(0).getPhotographerName());
        assertFalse(res1.getImages().get(0).isRepresentsEntity());
        verify(pexelsImageProvider, times(1)).getDestinationImages(any());

        // 2nd call -> served from cache
        DestinationImagesResponseDto res2 = imageService.getDestinationImages(req);
        assertEquals(1, res2.getCount());
        assertEquals("Karim Bennani", res2.getImages().get(0).getPhotographerName());
        assertFalse(res2.getImages().get(0).isRepresentsEntity());
        verify(pexelsImageProvider, times(1)).getDestinationImages(any());
    }

    @Test
    @DisplayName("Flight Search: Scrappa called once within TTL, revalidateOffer ALWAYS bypasses cache")
    void testFlightSearchAndRevalidationInvariant() {
        when(providerRegistry.getProviderForProduct(TravelProduct.FLIGHTS)).thenReturn(flightProvider);
        when(flightProvider.getMetadata()).thenReturn(ProviderMetadata.builder().providerCode("SCRAPPA").displayName("Scrappa").build());

        FlightOfferDto offer = FlightOfferDto.builder()
                .offerId("fl-1")
                .origin("CMN")
                .destination("RAK")
                .price(new BigDecimal("850.00"))
                .currency("MAD")
                .build();
        when(flightProvider.searchFlights(any())).thenReturn(List.of(offer));

        TravelSearchService searchService = new TravelSearchService(providerRegistry, null, null, cache, cacheProperties);

        FlightSearchRequest req = FlightSearchRequest.builder()
                .origin("CMN")
                .destination("RAK")
                .departureDate(LocalDate.of(2026, 10, 1))
                .adults(1)
                .travelClass(TravelClass.ECONOMY)
                .currency("MAD")
                .build();

        // 1st flight search -> provider called
        SearchResponse<FlightOfferDto> r1 = searchService.searchFlights(req);
        assertEquals(1, r1.getResults().size());
        verify(flightProvider, times(1)).searchFlights(any());

        // 2nd flight search -> cache hit
        SearchResponse<FlightOfferDto> r2 = searchService.searchFlights(req);
        assertEquals(1, r2.getResults().size());
        verify(flightProvider, times(1)).searchFlights(any());

        // REVALIDATION INVARIANT: revalidateOffer must ALWAYS query provider live
        when(providerRegistry.getProvider("SCRAPPA")).thenReturn(flightProvider);
        OfferRevalidationResult validResult = OfferRevalidationResult.builder()
                .offerId("fl-1")
                .provider("SCRAPPA")
                .available(true)
                .currentPrice(new BigDecimal("850.00"))
                .currency("MAD")
                .build();
        when(flightProvider.revalidateOffer(any())).thenReturn(validResult);

        RevalidateOfferRequest revReq = RevalidateOfferRequest.builder()
                .offerId("fl-1")
                .provider("SCRAPPA")
                .productType(TravelProduct.FLIGHTS)
                .originalPrice(new BigDecimal("850.00"))
                .currency("MAD")
                .build();

        // Call 1
        searchService.revalidateOffer(revReq);
        verify(flightProvider, times(1)).revalidateOffer(any());

        // Call 2: must call provider AGAIN (never cached!)
        searchService.revalidateOffer(revReq);
        verify(flightProvider, times(2)).revalidateOffer(any());
    }
}
