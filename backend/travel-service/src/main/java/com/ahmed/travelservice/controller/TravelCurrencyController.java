package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.response.PriceConversionSnapshot;
import com.ahmed.travelservice.service.CurrencyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;

/** Provider-neutral read endpoint for the price-conversion model used by Yuding search results. */
@RestController
@RequestMapping("/travel/currency")
public class TravelCurrencyController {
    private final CurrencyService currencyService;
    public TravelCurrencyController(CurrencyService currencyService) { this.currencyService = currencyService; }

    @GetMapping("/rate")
    public ResponseEntity<PriceConversionSnapshot> getRate(@RequestParam String from, @RequestParam String to) {
        return ResponseEntity.ok(currencyService.convert(BigDecimal.ONE, from, to));
    }
}
