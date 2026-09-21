package com.ahmed.travelservice.provider.geo;

import com.ahmed.travelservice.dto.geo.*;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.error.TravelProviderException;

import java.util.List;

/**
 * Provider-neutral abstraction for geographic and location services.
 */
public interface GeoProvider {

    ProviderMetadata getMetadata();

    List<GeoPlaceDto> autocomplete(GeoAutocompleteRequest request) throws TravelProviderException;

    List<GeoPlaceDto> geocode(GeoGeocodeRequest request) throws TravelProviderException;

    GeoPlaceDto reverseGeocode(GeoReverseRequest request) throws TravelProviderException;

    List<NearbyPlaceDto> findNearbyPlaces(NearbyPlacesRequest request) throws TravelProviderException;

    byte[] getStaticMap(StaticMapRequest request) throws TravelProviderException;
}
