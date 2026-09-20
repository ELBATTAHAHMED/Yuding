package com.ahmed.travelservice.domain.query;

import com.ahmed.travelservice.provider.TravelProduct;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class RevalidateOfferQuery {
    String offerId;
    String provider;
    TravelProduct productType;
    BigDecimal originalPrice;
    String currency;
}
