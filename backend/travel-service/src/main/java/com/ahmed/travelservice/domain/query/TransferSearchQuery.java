package com.ahmed.travelservice.domain.query;

import com.ahmed.travelservice.domain.enums.TransferType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalTime;

@Value
@Builder
public class TransferSearchQuery {
    String pickup;
    String dropoff;
    LocalDate date;
    LocalTime time;
    int passengers;
    TransferType transferType;
    String currency;
}
