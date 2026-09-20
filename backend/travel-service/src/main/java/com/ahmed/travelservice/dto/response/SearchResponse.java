package com.ahmed.travelservice.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Collections;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResponse<T> {
    private String searchId;
    private String status;
    private String message;
    private int totalResults;
    private List<T> results;

    public static <T> SearchResponse<T> providerUnavailable(String searchId, String message) {
        return SearchResponse.<T>builder()
                .searchId(searchId)
                .status("PROVIDER_UNAVAILABLE")
                .message(message != null ? message : "Travel provider integrations are scheduled for Phase 21+. Search request validated successfully.")
                .totalResults(0)
                .results(Collections.emptyList())
                .build();
    }

    public static <T> SearchResponse<T> success(String searchId, List<T> results) {
        return SearchResponse.<T>builder()
                .searchId(searchId)
                .status("SUCCESS")
                .message("Search completed successfully")
                .totalResults(results != null ? results.size() : 0)
                .results(results != null ? results : Collections.emptyList())
                .build();
    }
}
