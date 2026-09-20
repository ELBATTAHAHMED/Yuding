package com.ahmed.travelservice.provider.scrappa;

import com.ahmed.travelservice.config.ScrappaProperties;
import com.ahmed.travelservice.domain.enums.TravelClass;
import com.ahmed.travelservice.domain.query.FlightSearchQuery;
import com.ahmed.travelservice.dto.response.FlightOfferDto;
import com.ahmed.travelservice.provider.impl.scrappa.ScrappaClient;
import com.ahmed.travelservice.provider.impl.scrappa.ScrappaTravelProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.*;

/**
 * LIVE smoke test — calls the REAL Scrappa API.
 *
 * CREDIT PROTECTION:
 * This test is DISABLED by default and will ONLY run when:
 *   SCRAPPA_LIVE_TEST=true
 *   SCRAPPA_API_KEY=<real key>
 *
 * Never runs during: mvn test, CI, npm test, npm run build.
 *
 * To run manually from PowerShell:
 *   $env:SCRAPPA_LIVE_TEST="true"
 *   Load-EnvFile (use scripts/start-travel-service.ps1 logic or set vars manually)
 *   mvn test -pl backend/travel-service -Dtest=ScrappaLiveSmokeTest
 *
 * Test route: CMN → CDG (Casablanca to Paris)
 * Expected: at least 1 real flight result with valid airline/price data.
 */
@EnabledIfEnvironmentVariable(named = "SCRAPPA_LIVE_TEST", matches = "true")
class ScrappaLiveSmokeTest {

    private ScrappaTravelProvider provider;

    @BeforeEach
    void setUp() {
        String apiKey = System.getenv("SCRAPPA_API_KEY");
        assertThat(apiKey).as("SCRAPPA_API_KEY must be set for live tests").isNotBlank();

        ScrappaProperties props = new ScrappaProperties();
        props.setApiKey(apiKey);
        props.setBaseUrl("https://scrappa.co/api");
        props.setConnectTimeoutMs(10000);
        props.setReadTimeoutMs(30000);

        provider = new ScrappaTravelProvider(new ScrappaClient(props));
    }

    @Test
    void liveSmoke_oneWay_CMN_CDG_returnsRealFlights() {
        // Use a date ~2 months ahead to maximize availability
        LocalDate departureDate = LocalDate.now().plusMonths(2).withDayOfMonth(15);

        FlightSearchQuery query = FlightSearchQuery.builder()
                .origin("CMN")
                .destination("CDG")
                .departureDate(departureDate)
                .adults(1)
                .children(0)
                .infants(0)
                .travelClass(TravelClass.ECONOMY)
                .nonStop(false)
                .currency("EUR")
                .build();

        List<FlightOfferDto> offers = provider.searchFlights(query);

        // Verify provider returned real data
        assertThat(offers).as("Expected at least 1 real flight from Scrappa").isNotEmpty();

        FlightOfferDto first = offers.get(0);
        assertThat(first.getProvider()).isEqualTo("SCRAPPA");
        assertThat(first.getPrice()).as("Price must be positive").isPositive();
        assertThat(first.getCurrency()).as("Currency must be set").isNotBlank();
        assertThat(first.getOfferId()).as("offerId must be generated").isNotBlank();

        // Log safe summary (no key, no full response)
        System.out.println("[LiveSmoke] ✅ One-way CMN→CDG results: " + offers.size());
        System.out.println("[LiveSmoke] First offer: provider=" + first.getProvider()
                + " airline=" + first.getAirlineCode()
                + " price=" + first.getPrice() + " " + first.getCurrency()
                + " departure=" + first.getDepartureTime()
                + " duration=" + first.getTotalDurationMinutes() + "min"
                + " stops=" + first.getStops());
    }
}
