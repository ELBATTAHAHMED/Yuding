package com.ahmed.aiservice.client;

import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * Internal REST client communicating with reservation-service (default port 8090).
 * Forwards caller JWT token for defense-in-depth ownership verification.
 */
@Component
public class InternalBookingClient {

    private static final Logger log = LoggerFactory.getLogger(InternalBookingClient.class);

    private final RestClient restClient;

    public InternalBookingClient(@Value("${yuding.services.reservation-url:http://localhost:8090}") String reservationServiceUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(reservationServiceUrl)
                .build();
    }

    /**
     * Fetches booking details by public reference, forwarding caller's JWT token.
     *
     * @param reference public booking reference (YUD-XXXXXXXX)
     * @param jwtToken caller's raw RS256 JWT bearer token
     * @return JsonNode containing booking data
     */
    public JsonNode getBookingByReference(String reference, String jwtToken) {
        log.debug("Calling reservation-service /bookings/{} with caller token", reference);
        return restClient.get()
                .uri("/bookings/{reference}", reference)
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + jwtToken)
                .retrieve()
                .body(JsonNode.class);
    }
}
