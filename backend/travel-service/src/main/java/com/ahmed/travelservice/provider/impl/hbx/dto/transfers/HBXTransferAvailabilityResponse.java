package com.ahmed.travelservice.provider.impl.hbx.dto.transfers;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class HBXTransferAvailabilityResponse {
    private List<TransferService> services;
    private Object search;
    private ErrorDetail error;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class TransferService {
        private String id;
        private String rateKey;
        private String direction;
        private String transferType;
        private Vehicle vehicle;
        private Category category;
        private PickupInformation pickupInformation;
        private Price price;
        private EstimatedTime estimatedTime;
        private Factsheet factsheet;
        private Integer maxPaxCapacity;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Vehicle {
        private String code;
        private String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Category {
        private String code;
        private String name;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PickupInformation {
        private Point from;
        private Point to;
        private String date;
        private String time;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Point {
        private String code;
        private String description;
        private String type;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Price {
        private BigDecimal totalAmount;
        private BigDecimal netAmount;
        private String currencyId;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class EstimatedTime {
        private Double value;
        private String metric;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Factsheet {
        private Integer maxLuggage;
        private Integer maxBags;
        private Integer maxPax;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ErrorDetail {
        private String code;
        private String message;
        private String description;
    }
}
