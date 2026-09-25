package com.ahmed.identityservice.service;

import com.ahmed.identityservice.dto.TripPlanSummaryDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Optional;
import java.util.UUID;

@Component
@Slf4j
public class TripPlanClient {

    private final RestClient restClient;

    public TripPlanClient(
            @Value("${yuding.services.ai-url:http://localhost:7777}") String aiUrl,
            RestClient.Builder restClientBuilder
    ) {
        this.restClient = restClientBuilder
                .baseUrl(aiUrl)
                .build();
    }

    public Optional<TripPlanSummaryDto> getOwnedTripPlan(UUID userId, String tripPlanReference, String token) {
        if (tripPlanReference == null || tripPlanReference.isBlank()) {
            return Optional.empty();
        }

        try {
            var request = restClient.get()
                    .uri("/api/ai/trip-plans/{ref}", tripPlanReference)
                    .header("X-User-Id", userId.toString());

            if (token != null && !token.isBlank()) {
                request.header("Authorization", "Bearer " + token);
            }

            var responseEntity = request.retrieve()
                    .toEntity(TripPlanSummaryDto.class);

            if (responseEntity.getStatusCode().is2xxSuccessful() && responseEntity.getBody() != null) {
                return Optional.of(responseEntity.getBody());
            }
            return Optional.empty();
        } catch (HttpClientErrorException.NotFound | HttpClientErrorException.Forbidden e) {
            log.warn("Trip plan {} access denied/not found for user {}: {}", tripPlanReference, userId, e.getStatusCode());
            return Optional.empty();
        } catch (Exception e) {
            log.warn("Trip plan {} validation encountered error: {}", tripPlanReference, e.getMessage());
            return Optional.empty();
        }
    }
}
