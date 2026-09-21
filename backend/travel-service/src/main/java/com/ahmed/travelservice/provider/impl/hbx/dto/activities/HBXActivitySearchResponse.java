package com.ahmed.travelservice.provider.impl.hbx.dto.activities;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class HBXActivitySearchResponse {
    private String operationId;
    private List<HBXActivity> activities;
    private Pagination pagination;
    private ErrorDetail error;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Pagination {
        private Integer page;
        private Integer itemsPerPage;
        private Integer totalItems;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HBXActivity {
        private String code;
        private String name;
        private String type;
        private String currency;
        private String countryCode;
        private List<Modality> modalities;
        private Content content;
        private List<AmountFrom> amountsFrom;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Modality {
        private String code;
        private String name;
        private List<AmountFrom> amountsFrom;
        private List<Rate> rates;
        private Duration duration;
        private List<Comment> comments;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class AmountFrom {
        private String paxType;
        private Integer ageFrom;
        private Integer ageTo;
        private BigDecimal amount;
        private BigDecimal boxOfficeAmount;
        private Boolean mandatoryApplyAmount;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Rate {
        private String rateCode;
        private List<RateDetail> rateDetails;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RateDetail {
        private String rateKey;
        private String operationDate;
        private TotalAmount totalAmount;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TotalAmount {
        private BigDecimal amount;
        private BigDecimal boxOfficeAmount;
        private Boolean mandatoryApplyAmount;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Duration {
        private Double value;
        private String metric;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Comment {
        private String type;
        private String text;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Content {
        private String description;
        private String summary;
        private Media media;
        private Feature feature;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Media {
        private List<Image> images;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Image {
        private String visualizationOrder;
        private String mimeType;
        private List<ImageUrl> urls;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ImageUrl {
        private Integer dpi;
        private Integer height;
        private Integer width;
        private String resource;
        private String sizeType;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Feature {
        private String category;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ErrorDetail {
        private String code;
        private String message;
        private String description;
    }
}
