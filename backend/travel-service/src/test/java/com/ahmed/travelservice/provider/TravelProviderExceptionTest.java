package com.ahmed.travelservice.provider;

import com.ahmed.travelservice.dto.response.ErrorResponse;
import com.ahmed.travelservice.exception.GlobalExceptionHandler;
import com.ahmed.travelservice.provider.error.ProviderErrorCode;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class TravelProviderExceptionTest {

    private GlobalExceptionHandler exceptionHandler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/travel/offers/revalidate");
    }

    @Test
    @DisplayName("OFFER_NOT_FOUND maps to 404 NOT_FOUND")
    void offerNotFoundMapsTo404() {
        TravelProviderException ex = TravelProviderException.offerNotFound("PROVIDER_X", "offer-999");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTravelProviderException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("OFFER_NOT_FOUND");
        assertThat(response.getBody().message()).contains("offer-999");
    }

    @Test
    @DisplayName("OFFER_EXPIRED maps to 410 GONE")
    void offerExpiredMapsTo410() {
        TravelProviderException ex = TravelProviderException.offerExpired("PROVIDER_X", "offer-111");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTravelProviderException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.GONE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("OFFER_EXPIRED");
    }

    @Test
    @DisplayName("PROVIDER_RATE_LIMITED maps to 429 TOO_MANY_REQUESTS")
    void rateLimitedMapsTo429() {
        TravelProviderException ex = new TravelProviderException("PROVIDER_X", ProviderErrorCode.PROVIDER_RATE_LIMITED, "Rate limit exceeded");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTravelProviderException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("PROVIDER_RATE_LIMITED");
    }

    @Test
    @DisplayName("CAPABILITY_NOT_SUPPORTED maps to 501 NOT_IMPLEMENTED")
    void capabilityNotSupportedMapsTo501() {
        TravelProviderException ex = TravelProviderException.capabilityNotSupported("HOTEL_ONLY", "FLIGHTS");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTravelProviderException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_IMPLEMENTED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("CAPABILITY_NOT_SUPPORTED");
    }

    @Test
    @DisplayName("PROVIDER_UNAVAILABLE maps to 503 SERVICE_UNAVAILABLE")
    void unavailableMapsTo503() {
        TravelProviderException ex = TravelProviderException.unavailable("PROVIDER_X", "Service down for maintenance");
        ResponseEntity<ErrorResponse> response = exceptionHandler.handleTravelProviderException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().error()).isEqualTo("PROVIDER_UNAVAILABLE");
    }
}
