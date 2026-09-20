package com.ahmed.travelservice.provider.impl.nuitee.dto;

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
public class NuiteeRatesRequest {
    private String checkin;
    private String checkout;
    private String currency;
    private String guestNationality;
    private List<NuiteeOccupancy> occupancies;
    private String cityName;
    private String countryCode;
    private List<String> hotelIds;
    private Integer limit;
    private Integer timeout;
    private Boolean includeHotelData;
}
