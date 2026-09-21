package com.ahmed.travelservice.provider.impl.hbx.dto.activities;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class HBXActivitySearchRequest {
    private List<FilterGroup> filters;
    private String from;
    private String to;
    private String language;
    private Pagination pagination;
    private String order;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilterGroup {
        private List<SearchFilterItem> searchFilterItems;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SearchFilterItem {
        private String type;
        private String value;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Pagination {
        private int page;
        private int itemsPerPage;
    }
}
