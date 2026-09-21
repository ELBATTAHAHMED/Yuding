package com.ahmed.travelservice.provider.impl.frankfurter;

import com.ahmed.travelservice.config.FrankfurterProperties;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.frankfurter.model.FrankfurterRateResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;

/** Server-side Frankfurter v2 HTTP adapter. The browser never calls Frankfurter. */
@Component
public class FrankfurterClient {
    public static final String PROVIDER_CODE = "FRANKFURTER";
    private final FrankfurterProperties properties;
    private final RestClient restClient;

    @Autowired
    public FrankfurterClient(FrankfurterProperties properties) {
        this(properties, defaultClient(properties));
    }

    public FrankfurterClient(FrankfurterProperties properties, RestClient restClient) {
        this.properties = properties;
        this.restClient = restClient;
    }

    private static RestClient defaultClient(FrankfurterProperties properties) {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getConnectTimeoutMs());
        factory.setReadTimeout(properties.getReadTimeoutMs());
        return RestClient.builder().requestFactory(factory).baseUrl(properties.getBaseUrl())
                .defaultHeader(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader(HttpHeaders.USER_AGENT, "Yuding/2.0 (Currency; travel-service)").build();
    }

    public FrankfurterRateResponse getRate(String fromCurrency, String toCurrency) {
        if (!properties.isConfigured()) {
            throw TravelProviderException.notConfigured(PROVIDER_CODE, "Frankfurter base URL is not configured");
        }
        try {
            FrankfurterRateResponse response = restClient.get().uri("/v2/rate/{from}/{to}",
                            fromCurrency.toLowerCase(), toCurrency.toLowerCase())
                    .retrieve().onStatus(HttpStatusCode::isError, (request, result) -> handleError(result.getStatusCode()))
                    .body(FrankfurterRateResponse.class);
            if (response == null || response.rate() == null || response.rate().signum() <= 0) {
                throw new TravelProviderException(PROVIDER_CODE, ProviderErrorCode.PROVIDER_RESPONSE_INVALID,
                        "Frankfurter returned an invalid exchange rate");
            }
            return response;
        } catch (ResourceAccessException exception) {
            throw TravelProviderException.timeout(PROVIDER_CODE, "Frankfurter exchange-rate request timed out");
        } catch (TravelProviderException exception) {
            throw exception;
        } catch (Exception exception) {
            throw TravelProviderException.unavailable(PROVIDER_CODE, "Frankfurter exchange-rate request failed");
        }
    }

    private void handleError(HttpStatusCode status) {
        if (status.value() == 429) throw TravelProviderException.rateLimitExceeded(PROVIDER_CODE, "Frankfurter rate limit reached");
        if (status.is4xxClientError()) throw TravelProviderException.invalidSearch(PROVIDER_CODE, "Frankfurter does not support this currency pair");
        throw TravelProviderException.unavailable(PROVIDER_CODE, "Frankfurter is temporarily unavailable");
    }
}
