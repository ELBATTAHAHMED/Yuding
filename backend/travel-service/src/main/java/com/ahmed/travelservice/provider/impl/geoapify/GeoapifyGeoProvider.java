package com.ahmed.travelservice.provider.impl.geoapify;

import com.ahmed.travelservice.dto.geo.*;
import com.ahmed.travelservice.provider.ProviderMetadata;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.geo.GeoProvider;
import com.ahmed.travelservice.provider.impl.geoapify.model.GeoapifyModels.Feature;
import com.ahmed.travelservice.provider.impl.geoapify.model.GeoapifyModels.FeatureCollection;
import com.ahmed.travelservice.provider.impl.geoapify.model.GeoapifyModels.Properties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Geoapify implementation of the provider-neutral GeoProvider abstraction.
 */
@Component
@RequiredArgsConstructor
public class GeoapifyGeoProvider implements GeoProvider {

    private final GeoapifyClient client;

    private static final ProviderMetadata METADATA = ProviderMetadata.builder()
            .providerCode("GEOAPIFY")
            .displayName("Geoapify Geo & Places")
            .supportedCapabilities(Collections.emptySet())
            .build();

    @Override
    public ProviderMetadata getMetadata() {
        return METADATA;
    }

    @Override
    public List<GeoPlaceDto> autocomplete(GeoAutocompleteRequest request) throws TravelProviderException {
        FeatureCollection fc = client.autocomplete(
                request.getText(),
                request.getType(),
                request.getLanguage(),
                request.getCountry(),
                request.getLimit(),
                request.getBiasLat(),
                request.getBiasLon()
        );
        return mapFeaturesToPlaces(fc);
    }

    @Override
    public List<GeoPlaceDto> geocode(GeoGeocodeRequest request) throws TravelProviderException {
        FeatureCollection fc = client.geocode(
                request.getText(),
                request.getLanguage(),
                request.getCountry(),
                request.getLimit()
        );
        return mapFeaturesToPlaces(fc);
    }

    @Override
    public GeoPlaceDto reverseGeocode(GeoReverseRequest request) throws TravelProviderException {
        FeatureCollection fc = client.reverseGeocode(
                request.getLatitude(),
                request.getLongitude(),
                request.getLanguage()
        );
        List<GeoPlaceDto> places = mapFeaturesToPlaces(fc);
        return places.isEmpty() ? null : places.get(0);
    }

    @Override
    public List<NearbyPlaceDto> findNearbyPlaces(NearbyPlacesRequest request) throws TravelProviderException {
        String translatedCategories = translateCategories(request.getCategories());
        FeatureCollection fc = client.findPlaces(
                request.getLatitude(),
                request.getLongitude(),
                request.getRadiusMeters(),
                translatedCategories,
                request.getLimit(),
                request.getLanguage()
        );
        return mapFeaturesToNearbyPlaces(fc);
    }

    @Override
    public byte[] getStaticMap(StaticMapRequest request) throws TravelProviderException {
        return client.getStaticMap(
                request.getCenterLat(),
                request.getCenterLon(),
                request.getZoom(),
                request.getWidth(),
                request.getHeight(),
                request.getMarkers()
        );
    }

    private List<GeoPlaceDto> mapFeaturesToPlaces(FeatureCollection fc) {
        if (fc == null || fc.getFeatures() == null) {
            return Collections.emptyList();
        }

        List<GeoPlaceDto> results = new ArrayList<>();
        for (Feature feature : fc.getFeatures()) {
            if (feature == null) continue;
            Properties prop = feature.getProperties();

            Double lat = null;
            Double lon = null;
            if (prop != null && prop.getLat() != null && prop.getLon() != null) {
                lat = prop.getLat();
                lon = prop.getLon();
            } else if (feature.getGeometry() != null && feature.getGeometry().getCoordinates() != null && feature.getGeometry().getCoordinates().size() >= 2) {
                lon = feature.getGeometry().getCoordinates().get(0);
                lat = feature.getGeometry().getCoordinates().get(1);
            }

            String placeId = (prop != null && prop.getPlaceId() != null) ? prop.getPlaceId() : UUID.randomUUID().toString();
            String name = (prop != null && prop.getName() != null && !prop.getName().isBlank())
                    ? prop.getName()
                    : (prop != null && prop.getCity() != null ? prop.getCity() : (prop != null ? prop.getFormatted() : "Unknown"));

            String countryCode = (prop != null && prop.getCountryCode() != null)
                    ? prop.getCountryCode().toUpperCase(Locale.ROOT)
                    : null;

            results.add(GeoPlaceDto.builder()
                    .id(placeId)
                    .provider("GEOAPIFY")
                    .name(name)
                    .formatted(prop != null ? prop.getFormatted() : name)
                    .type(prop != null ? prop.getResultType() : "place")
                    .city(prop != null ? prop.getCity() : null)
                    .state(prop != null ? prop.getState() : null)
                    .country(prop != null ? prop.getCountry() : null)
                    .countryCode(countryCode)
                    .postcode(prop != null ? prop.getPostcode() : null)
                    .latitude(lat)
                    .longitude(lon)
                    .build());
        }
        return results;
    }

    private List<NearbyPlaceDto> mapFeaturesToNearbyPlaces(FeatureCollection fc) {
        if (fc == null || fc.getFeatures() == null) {
            return Collections.emptyList();
        }

        List<NearbyPlaceDto> results = new ArrayList<>();
        for (Feature feature : fc.getFeatures()) {
            if (feature == null) continue;
            Properties prop = feature.getProperties();

            Double lat = null;
            Double lon = null;
            if (prop != null && prop.getLat() != null && prop.getLon() != null) {
                lat = prop.getLat();
                lon = prop.getLon();
            } else if (feature.getGeometry() != null && feature.getGeometry().getCoordinates() != null && feature.getGeometry().getCoordinates().size() >= 2) {
                lon = feature.getGeometry().getCoordinates().get(0);
                lat = feature.getGeometry().getCoordinates().get(1);
            }

            List<String> rawCats = (prop != null && prop.getCategories() != null) ? prop.getCategories() : Collections.emptyList();
            String primaryCategory = normalizeCategory(rawCats);

            String placeId = (prop != null && prop.getPlaceId() != null) ? prop.getPlaceId() : UUID.randomUUID().toString();
            String name = (prop != null && prop.getName() != null && !prop.getName().isBlank())
                    ? prop.getName()
                    : (prop != null && prop.getFormatted() != null ? prop.getFormatted() : "Point d'intérêt");

            results.add(NearbyPlaceDto.builder()
                    .id(placeId)
                    .provider("GEOAPIFY")
                    .name(name)
                    .category(primaryCategory)
                    .rawCategories(rawCats)
                    .formattedAddress(prop != null ? prop.getFormatted() : null)
                    .distanceMeters(prop != null ? prop.getDistance() : null)
                    .latitude(lat)
                    .longitude(lon)
                    .city(prop != null ? prop.getCity() : null)
                    .country(prop != null ? prop.getCountry() : null)
                    .build());
        }
        return results;
    }

    /**
     * Translates provider-neutral categories to Geoapify category filters.
     */
    private String translateCategories(List<String> categories) {
        if (categories == null || categories.isEmpty()) {
            return "tourism.sights,catering.restaurant,catering.cafe,entertainment.museum,leisure.park";
        }

        Set<String> translated = new LinkedHashSet<>();
        for (String cat : categories) {
            if (cat == null) continue;
            String normalized = cat.trim().toLowerCase();
            switch (normalized) {
                case "attractions", "tourism" -> translated.add("tourism.sights,tourism.attraction");
                case "museums", "culture" -> translated.add("entertainment.museum,entertainment.culture");
                case "restaurants" -> translated.add("catering.restaurant");
                case "cafes" -> translated.add("catering.cafe");
                case "parks" -> translated.add("leisure.park,national_park");
                case "shopping" -> translated.add("commercial.shopping_mall,commercial.supermarket");
                case "transport" -> translated.add("public_transport");
                case "accommodation" -> translated.add("accommodation.hotel");
                default -> {
                    // Safe passthrough if already a Geoapify dotted category or safe identifier
                    if (normalized.matches("^[a-z0-9_.]+$")) {
                        translated.add(normalized);
                    }
                }
            }
        }
        return String.join(",", translated);
    }

    /**
     * Maps raw Geoapify category tags to a friendly, normalized category name.
     */
    private String normalizeCategory(List<String> rawCategories) {
        if (rawCategories == null || rawCategories.isEmpty()) {
            return "attractions";
        }

        for (String c : rawCategories) {
            String lower = c.toLowerCase();
            if (lower.contains("museum") || lower.contains("gallery")) return "museums";
            if (lower.contains("sight") || lower.contains("tourism") || lower.contains("attraction") || lower.contains("monument") || lower.contains("heritage")) return "attractions";
            if (lower.contains("restaurant") || lower.contains("fast_food") || lower.contains("food")) return "restaurants";
            if (lower.contains("cafe") || lower.contains("coffee") || lower.contains("tea")) return "cafes";
            if (lower.contains("park") || lower.contains("garden") || lower.contains("nature")) return "parks";
            if (lower.contains("shopping") || lower.contains("mall") || lower.contains("supermarket") || lower.contains("market")) return "shopping";
            if (lower.contains("transport") || lower.contains("subway") || lower.contains("station") || lower.contains("airport") || lower.contains("bus")) return "transport";
            if (lower.contains("hotel") || lower.contains("accommodation")) return "accommodation";
        }
        return "attractions";
    }
}
