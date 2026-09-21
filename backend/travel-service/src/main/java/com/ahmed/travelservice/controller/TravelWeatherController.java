package com.ahmed.travelservice.controller;

import com.ahmed.travelservice.dto.weather.WeatherResponseDto;
import com.ahmed.travelservice.service.WeatherService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Public, Gateway-routed weather endpoint. Provider details remain server-side. */
@RestController
@RequestMapping("/travel/weather")
@RequiredArgsConstructor
public class TravelWeatherController {
    private final WeatherService weatherService;

    @GetMapping
    public ResponseEntity<WeatherResponseDto> getWeather(
            @RequestParam Double lat,
            @RequestParam Double lon,
            @RequestParam(required = false) Integer forecastDays) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(10)).cachePublic())
                .body(weatherService.getWeather(lat, lon, forecastDays));
    }
}
