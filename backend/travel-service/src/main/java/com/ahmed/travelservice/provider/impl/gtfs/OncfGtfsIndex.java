package com.ahmed.travelservice.provider.impl.gtfs;

import com.ahmed.travelservice.dto.response.TrainOfferDto;
import com.ahmed.travelservice.dto.response.TrainStationDto;
import com.ahmed.travelservice.dto.response.TrainStopDto;
import com.ahmed.travelservice.provider.error.TravelProviderException;
import com.ahmed.travelservice.provider.impl.gtfs.model.GtfsModels.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * High-performance, in-memory index for local ONCF GTFS datasets.
 * Pre-indexes parent stations, platforms, routes, trips, calendar service schedules,
 * and stop times for fast timetable lookups.
 */
public class OncfGtfsIndex {

    private static final Logger log = LoggerFactory.getLogger(OncfGtfsIndex.class);
    private static final DateTimeFormatter GTFS_DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyyMMdd");

    private volatile boolean loaded = false;
    private String feedVersion = "community";
    private LocalDate earliestCalendarDate;
    private LocalDate latestCalendarDate;

    // Station lookups
    private final Map<String, TrainStationDto> stationsById = new LinkedHashMap<>();
    private final Map<String, String> stopIdToParentStationId = new ConcurrentHashMap<>();
    private final Map<String, String> normalizedNameToStationId = new ConcurrentHashMap<>();

    // GTFS entity stores
    private final Map<String, GtfsRoute> routesById = new ConcurrentHashMap<>();
    private final Map<String, GtfsTrip> tripsById = new ConcurrentHashMap<>();
    private final Map<String, List<GtfsStopTime>> stopTimesByTrip = new ConcurrentHashMap<>();
    private final Map<String, GtfsCalendar> calendarByServiceId = new ConcurrentHashMap<>();
    private final Map<String, GtfsCalendarDate> calendarDatesByServiceAndDate = new ConcurrentHashMap<>();

    // Traversal acceleration: parentStationId -> Set of tripIds stopping at that station
    private final Map<String, Set<String>> tripsByParentStation = new ConcurrentHashMap<>();

    public synchronized void loadFromDirectory(File dir) throws IOException {
        if (dir == null || !dir.exists() || !dir.isDirectory()) {
            throw new IOException("GTFS data directory does not exist: " + (dir != null ? dir.getAbsolutePath() : "null"));
        }

        log.info("Loading ONCF GTFS dataset from directory: {}", dir.getAbsolutePath());
        clear();

        File feedInfoFile = new File(dir, "feed_info.txt");
        if (feedInfoFile.exists()) {
            parseFeedInfo(feedInfoFile);
        }

        File calendarFile = new File(dir, "calendar.txt");
        if (!calendarFile.exists()) {
            throw new IOException("Required GTFS file missing: calendar.txt");
        }
        parseCalendar(calendarFile);

        File calendarDatesFile = new File(dir, "calendar_dates.txt");
        if (calendarDatesFile.exists()) {
            parseCalendarDates(calendarDatesFile);
        }

        File stopsFile = new File(dir, "stops.txt");
        if (!stopsFile.exists()) {
            throw new IOException("Required GTFS file missing: stops.txt");
        }
        parseStops(stopsFile);

        File routesFile = new File(dir, "routes.txt");
        if (!routesFile.exists()) {
            throw new IOException("Required GTFS file missing: routes.txt");
        }
        parseRoutes(routesFile);

        File tripsFile = new File(dir, "trips.txt");
        if (!tripsFile.exists()) {
            throw new IOException("Required GTFS file missing: trips.txt");
        }
        parseTrips(tripsFile);

        File stopTimesFile = new File(dir, "stop_times.txt");
        if (!stopTimesFile.exists()) {
            throw new IOException("Required GTFS file missing: stop_times.txt");
        }
        parseStopTimes(stopTimesFile);

        buildAccelerationIndexes();
        this.loaded = true;

        log.info("ONCF GTFS successfully loaded: {} stations, {} routes, {} trips, calendar valid {} to {}",
                stationsById.size(), routesById.size(), tripsById.size(), earliestCalendarDate, latestCalendarDate);
    }

    public boolean isLoaded() {
        return loaded;
    }

    public String getFeedVersion() {
        return feedVersion;
    }

    public LocalDate getEarliestCalendarDate() {
        return earliestCalendarDate;
    }

    public LocalDate getLatestCalendarDate() {
        return latestCalendarDate;
    }

    public List<TrainStationDto> getStations() {
        return new ArrayList<>(stationsById.values());
    }

    public int getRouteCount() {
        return routesById.size();
    }

    public int getTripCount() {
        return tripsById.size();
    }

    public TrainStationDto resolveStation(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String trimmed = query.trim();

        // 1. Direct ID match
        if (stationsById.containsKey(trimmed)) {
            return stationsById.get(trimmed);
        }
        // Check uppercase
        String upper = trimmed.toUpperCase(Locale.ROOT);
        if (stationsById.containsKey(upper)) {
            return stationsById.get(upper);
        }

        // 2. Check stopIdToParentStationId
        if (stopIdToParentStationId.containsKey(trimmed)) {
            String parentId = stopIdToParentStationId.get(trimmed);
            return stationsById.get(parentId);
        }

        // 3. Normalized name match
        String normalized = normalize(trimmed);
        String stationId = normalizedNameToStationId.get(normalized);
        if (stationId != null) {
            return stationsById.get(stationId);
        }

        // 4. Fuzzy / substring match on normalized names
        for (Map.Entry<String, String> entry : normalizedNameToStationId.entrySet()) {
            if (entry.getKey().contains(normalized) || normalized.contains(entry.getKey())) {
                return stationsById.get(entry.getValue());
            }
        }

        return null;
    }

    public boolean isDateInCalendarRange(LocalDate date) {
        if (date == null || earliestCalendarDate == null || latestCalendarDate == null) {
            return false;
        }
        return !date.isBefore(earliestCalendarDate) && !date.isAfter(latestCalendarDate);
    }

    public boolean isServiceActive(String serviceId, LocalDate date) {
        if (serviceId == null || date == null) {
            return false;
        }

        // Check calendar_dates exceptions first
        String exceptionKey = serviceId + "_" + date.format(GTFS_DATE_FORMATTER);
        GtfsCalendarDate exception = calendarDatesByServiceAndDate.get(exceptionKey);
        if (exception != null) {
            return exception.getExceptionType() == 1; // 1 = added, 2 = removed
        }

        // Check regular calendar
        GtfsCalendar calendar = calendarByServiceId.get(serviceId);
        if (calendar == null) {
            return false;
        }

        if (date.isBefore(calendar.getStartDate()) || date.isAfter(calendar.getEndDate())) {
            return false;
        }

        return calendar.runsOn(date.getDayOfWeek());
    }

    /**
     * Searches for scheduled train offers between origin and destination on a given date.
     */
    public List<TrainOfferDto> searchTrains(String originQuery,
                                           String destinationQuery,
                                           LocalDate date,
                                           LocalTime departureTimeFilter,
                                           String currency) {
        if (!loaded) {
            throw TravelProviderException.providerUnavailable("ONCF_GTFS", "ONCF GTFS dataset is not loaded.", null);
        }

        TrainStationDto originStation = resolveStation(originQuery);
        TrainStationDto destStation = resolveStation(destinationQuery);

        if (originStation == null) {
            throw TravelProviderException.badRequest("Unknown origin train station: " + originQuery);
        }
        if (destStation == null) {
            throw TravelProviderException.badRequest("Unknown destination train station: " + destinationQuery);
        }
        if (originStation.getId().equals(destStation.getId())) {
            throw TravelProviderException.badRequest("Origin and destination stations cannot be the same");
        }

        // Enforce Data Freshness Gate
        if (!isDateInCalendarRange(date)) {
            String msg = String.format(
                    "Current timetable data is not available for date %s. The underlying GTFS schedule dataset is valid from %s to %s. Please verify official live schedules on ONCF: https://www.oncf-voyages.ma",
                    date, earliestCalendarDate, latestCalendarDate
            );
            throw TravelProviderException.scheduleDataOutdated("ONCF_GTFS", msg);
        }

        String originParentId = originStation.getId();
        String destParentId = destStation.getId();

        Set<String> originTrips = tripsByParentStation.getOrDefault(originParentId, Collections.emptySet());
        Set<String> destTrips = tripsByParentStation.getOrDefault(destParentId, Collections.emptySet());

        // Find common trips serving both origin and destination stations
        Set<String> candidateTripIds = new HashSet<>(originTrips);
        candidateTripIds.retainAll(destTrips);

        List<TrainOfferDto> offers = new ArrayList<>();
        String effectiveCurrency = (currency != null && !currency.isBlank()) ? currency.toUpperCase(Locale.ROOT) : "MAD";

        for (String tripId : candidateTripIds) {
            GtfsTrip trip = tripsById.get(tripId);
            if (trip == null) {
                continue;
            }

            // Verify service is active on date
            if (!isServiceActive(trip.getServiceId(), date)) {
                continue;
            }

            List<GtfsStopTime> stopTimes = stopTimesByTrip.get(tripId);
            if (stopTimes == null || stopTimes.isEmpty()) {
                continue;
            }

            // Locate origin and destination stops
            GtfsStopTime originStop = null;
            GtfsStopTime destStop = null;

            for (GtfsStopTime st : stopTimes) {
                String parentId = stopIdToParentStationId.get(st.getStopId());
                if (parentId == null) {
                    parentId = st.getStopId();
                }

                if (originStop == null && parentId.equals(originParentId)) {
                    originStop = st;
                } else if (originStop != null && parentId.equals(destParentId)) {
                    destStop = st;
                    break;
                }
            }

            // Valid direction: origin comes before destination
            if (originStop == null || destStop == null || originStop.getStopSequence() >= destStop.getStopSequence()) {
                continue;
            }

            // Apply optional departure time filter
            if (departureTimeFilter != null) {
                int filterSeconds = departureTimeFilter.toSecondOfDay();
                if (originStop.getDepartureSeconds() < filterSeconds) {
                    continue;
                }
            }

            // Calculate duration in minutes
            int durationSeconds = destStop.getArrivalSeconds() - originStop.getDepartureSeconds();
            int durationMinutes = Math.max(1, durationSeconds / 60);

            // Intermediate stops
            List<TrainStopDto> intermediateStops = new ArrayList<>();
            for (GtfsStopTime st : stopTimes) {
                if (st.getStopSequence() > originStop.getStopSequence() && st.getStopSequence() < destStop.getStopSequence()) {
                    String parentId = stopIdToParentStationId.get(st.getStopId());
                    TrainStationDto intStation = (parentId != null) ? stationsById.get(parentId) : null;
                    String stationName = (intStation != null) ? intStation.getName() : st.getStopId();

                    intermediateStops.add(TrainStopDto.builder()
                            .stopSequence(st.getStopSequence())
                            .stationId(parentId != null ? parentId : st.getStopId())
                            .stationName(stationName)
                            .arrivalTime(formatGtfsTime(st.getArrivalSeconds()))
                            .departureTime(formatGtfsTime(st.getDepartureSeconds()))
                            .build());
                }
            }

            GtfsRoute route = routesById.get(trip.getRouteId());
            String productType = determineProductType(route);
            String routeName = (route != null && route.getRouteLongName() != null) ? route.getRouteLongName() :
                    (route != null && route.getRouteShortName() != null ? route.getRouteShortName() : "ONCF Rail");

            String trainNumber = (trip.getTripShortName() != null && !trip.getTripShortName().isBlank()) ?
                    trip.getTripShortName() : trip.getTripId();

            offers.add(TrainOfferDto.builder()
                    .offerId("train-" + trip.getTripId() + "-" + date)
                    .provider("ONCF_GTFS")
                    .source("ONCF_GTFS_COMMUNITY")
                    .operator("ONCF (Office National des Chemins de Fer)")
                    .trainNumber(trainNumber)
                    .routeName(routeName)
                    .productType(productType)
                    .originStation(originStation.getName())
                    .originStationId(originStation.getId())
                    .destinationStation(destStation.getName())
                    .destinationStationId(destStation.getId())
                    .departureDate(date.toString())
                    .departureTime(formatGtfsTime(originStop.getDepartureSeconds()))
                    .arrivalTime(formatGtfsTime(destStop.getArrivalSeconds()))
                    .durationMinutes(durationMinutes)
                    .direct(intermediateStops.isEmpty())
                    .stopsCount(intermediateStops.size())
                    .intermediateStops(intermediateStops)
                    .price(null) // Strictly null: Zero Price Invention rule!
                    .currency(effectiveCurrency)
                    .dataFreshness("GTFS timetable calendar coverage: " + earliestCalendarDate + " to " + latestCalendarDate)
                    .feedValidityStart(earliestCalendarDate.toString())
                    .feedValidityEnd(latestCalendarDate.toString())
                    .officialScheduleUrl("https://www.oncf-voyages.ma")
                    .build());
        }

        // Sort by departure time ascending
        offers.sort(Comparator.comparing(TrainOfferDto::getDepartureTime));
        return offers;
    }

    private String determineProductType(GtfsRoute route) {
        if (route == null) {
            return "Al Atlas";
        }
        String shortName = (route.getRouteShortName() != null) ? route.getRouteShortName() : "";
        String longName = (route.getRouteLongName() != null) ? route.getRouteLongName() : "";
        String combined = (shortName + " " + longName).toLowerCase(Locale.ROOT);

        if (combined.contains("boraq") || combined.contains("lgv") || (route.getRouteType() != null && route.getRouteType() == 101)) {
            return "Al Boraq";
        }
        if (combined.contains("tnr") || combined.contains("navette") || combined.contains("aeroport") || combined.contains("aéroport")) {
            return "TNR";
        }
        if (combined.contains("supratours") || (route.getRouteType() != null && route.getRouteType() == 202)) {
            return "Supratours";
        }
        return "Al Atlas";
    }

    private String formatGtfsTime(int totalSeconds) {
        int hours = (totalSeconds / 3600) % 24;
        int minutes = (totalSeconds % 3600) / 60;
        int seconds = totalSeconds % 60;
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }

    private void parseFeedInfo(File file) {
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int versionIdx = header.indexOf("feed_version");
            String line;
            if ((line = reader.readLine()) != null) {
                List<String> values = parseCsvLine(line);
                if (versionIdx >= 0 && versionIdx < values.size()) {
                    this.feedVersion = values.get(versionIdx);
                }
            }
        } catch (Exception e) {
            log.warn("Could not parse feed_info.txt: {}", e.getMessage());
        }
    }

    private void parseCalendar(File file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int idIdx = header.indexOf("service_id");
            int monIdx = header.indexOf("monday");
            int tueIdx = header.indexOf("tuesday");
            int wedIdx = header.indexOf("wednesday");
            int thuIdx = header.indexOf("thursday");
            int friIdx = header.indexOf("friday");
            int satIdx = header.indexOf("saturday");
            int sunIdx = header.indexOf("sunday");
            int startIdx = header.indexOf("start_date");
            int endIdx = header.indexOf("end_date");

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> v = parseCsvLine(line);
                if (v.size() <= Math.max(idIdx, Math.max(startIdx, endIdx))) continue;

                LocalDate start = LocalDate.parse(v.get(startIdx), GTFS_DATE_FORMATTER);
                LocalDate end = LocalDate.parse(v.get(endIdx), GTFS_DATE_FORMATTER);

                if (earliestCalendarDate == null || start.isBefore(earliestCalendarDate)) {
                    earliestCalendarDate = start;
                }
                if (latestCalendarDate == null || end.isAfter(latestCalendarDate)) {
                    latestCalendarDate = end;
                }

                GtfsCalendar cal = GtfsCalendar.builder()
                        .serviceId(v.get(idIdx))
                        .monday("1".equals(v.get(monIdx)))
                        .tuesday("1".equals(v.get(tueIdx)))
                        .wednesday("1".equals(v.get(wedIdx)))
                        .thursday("1".equals(v.get(thuIdx)))
                        .friday("1".equals(v.get(friIdx)))
                        .saturday("1".equals(v.get(satIdx)))
                        .sunday("1".equals(v.get(sunIdx)))
                        .startDate(start)
                        .endDate(end)
                        .build();

                calendarByServiceId.put(cal.getServiceId(), cal);
            }
        }
    }

    private void parseCalendarDates(File file) {
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int idIdx = header.indexOf("service_id");
            int dateIdx = header.indexOf("date");
            int typeIdx = header.indexOf("exception_type");

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> v = parseCsvLine(line);
                if (v.size() <= Math.max(idIdx, Math.max(dateIdx, typeIdx))) continue;

                String sId = v.get(idIdx);
                String dStr = v.get(dateIdx);
                LocalDate date = LocalDate.parse(dStr, GTFS_DATE_FORMATTER);
                int type = Integer.parseInt(v.get(typeIdx));

                calendarDatesByServiceAndDate.put(sId + "_" + dStr,
                        GtfsCalendarDate.builder().serviceId(sId).date(date).exceptionType(type).build());
            }
        } catch (Exception e) {
            log.warn("Could not parse calendar_dates.txt: {}", e.getMessage());
        }
    }

    private void parseStops(File file) throws IOException {
        List<GtfsStop> rawStops = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int idIdx = header.indexOf("stop_id");
            int nameIdx = header.indexOf("stop_name");
            int latIdx = header.indexOf("stop_lat");
            int lonIdx = header.indexOf("stop_lon");
            int typeIdx = header.indexOf("location_type");
            int parentIdx = header.indexOf("parent_station");

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> v = parseCsvLine(line);
                if (v.size() <= idIdx) continue;

                String stopId = v.get(idIdx);
                String stopName = nameIdx >= 0 && nameIdx < v.size() ? v.get(nameIdx) : stopId;
                Double lat = latIdx >= 0 && latIdx < v.size() && !v.get(latIdx).isBlank() ? Double.valueOf(v.get(latIdx)) : null;
                Double lon = lonIdx >= 0 && lonIdx < v.size() && !v.get(lonIdx).isBlank() ? Double.valueOf(v.get(lonIdx)) : null;
                Integer locType = typeIdx >= 0 && typeIdx < v.size() && !v.get(typeIdx).isBlank() ? Integer.valueOf(v.get(typeIdx)) : 0;
                String parent = parentIdx >= 0 && parentIdx < v.size() && !v.get(parentIdx).isBlank() ? v.get(parentIdx) : null;

                rawStops.add(GtfsStop.builder()
                        .stopId(stopId)
                        .stopName(stopName)
                        .stopLat(lat)
                        .stopLon(lon)
                        .locationType(locType)
                        .parentStation(parent)
                        .build());
            }
        }

        // 1. Register parent stations (locationType == 1 or has child stops)
        Set<String> referencedParents = new HashSet<>();
        for (GtfsStop s : rawStops) {
            if (s.getParentStation() != null && !s.getParentStation().isBlank()) {
                referencedParents.add(s.getParentStation());
            }
        }

        for (GtfsStop s : rawStops) {
            boolean isParent = (s.getLocationType() != null && s.getLocationType() == 1)
                    || referencedParents.contains(s.getStopId());

            if (isParent) {
                String id = s.getStopId();
                String displayName = cleanStationName(s.getStopName());
                String city = deriveCity(displayName);

                TrainStationDto dto = TrainStationDto.builder()
                        .id(id)
                        .onestopId("oncf-" + id)
                        .name(displayName)
                        .city(city)
                        .country("Maroc")
                        .countryCode("MA")
                        .provider("ONCF_GTFS")
                        .locationType("STATION")
                        .latitude(s.getStopLat())
                        .longitude(s.getStopLon())
                        .build();

                stationsById.put(id, dto);
                stopIdToParentStationId.put(id, id);
                indexStationName(displayName, id);
            }
        }

        // 2. Map child platforms to parent stations
        for (GtfsStop s : rawStops) {
            if (s.getParentStation() != null && !s.getParentStation().isBlank()) {
                String parentId = s.getParentStation();
                stopIdToParentStationId.put(s.getStopId(), parentId);
            } else if (!stationsById.containsKey(s.getStopId())) {
                // Standalone stop with no parent: register as its own station
                String id = s.getStopId();
                String displayName = cleanStationName(s.getStopName());
                String city = deriveCity(displayName);

                TrainStationDto dto = TrainStationDto.builder()
                        .id(id)
                        .onestopId("oncf-" + id)
                        .name(displayName)
                        .city(city)
                        .country("Maroc")
                        .countryCode("MA")
                        .provider("ONCF_GTFS")
                        .locationType("STATION")
                        .latitude(s.getStopLat())
                        .longitude(s.getStopLon())
                        .build();

                stationsById.put(id, dto);
                stopIdToParentStationId.put(id, id);
                indexStationName(displayName, id);
            }
        }
    }

    private void parseRoutes(File file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int idIdx = header.indexOf("route_id");
            int agencyIdx = header.indexOf("agency_id");
            int shortIdx = header.indexOf("route_short_name");
            int longIdx = header.indexOf("route_long_name");
            int typeIdx = header.indexOf("route_type");

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> v = parseCsvLine(line);
                if (v.size() <= idIdx) continue;

                GtfsRoute route = GtfsRoute.builder()
                        .routeId(v.get(idIdx))
                        .agencyId(agencyIdx >= 0 && agencyIdx < v.size() ? v.get(agencyIdx) : null)
                        .routeShortName(shortIdx >= 0 && shortIdx < v.size() ? v.get(shortIdx) : "")
                        .routeLongName(longIdx >= 0 && longIdx < v.size() ? v.get(longIdx) : "")
                        .routeType(typeIdx >= 0 && typeIdx < v.size() && !v.get(typeIdx).isBlank() ? Integer.valueOf(v.get(typeIdx)) : 2)
                        .build();

                routesById.put(route.getRouteId(), route);
            }
        }
    }

    private void parseTrips(File file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int rIdIdx = header.indexOf("route_id");
            int sIdIdx = header.indexOf("service_id");
            int tIdIdx = header.indexOf("trip_id");
            int shortIdx = header.indexOf("trip_short_name");
            int headIdx = header.indexOf("trip_headsign");

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> v = parseCsvLine(line);
                if (v.size() <= Math.max(rIdIdx, Math.max(sIdIdx, tIdIdx))) continue;

                GtfsTrip trip = GtfsTrip.builder()
                        .routeId(v.get(rIdIdx))
                        .serviceId(v.get(sIdIdx))
                        .tripId(v.get(tIdIdx))
                        .tripShortName(shortIdx >= 0 && shortIdx < v.size() ? v.get(shortIdx) : "")
                        .tripHeadsign(headIdx >= 0 && headIdx < v.size() ? v.get(headIdx) : "")
                        .build();

                tripsById.put(trip.getTripId(), trip);
            }
        }
    }

    private void parseStopTimes(File file) throws IOException {
        try (BufferedReader reader = new BufferedReader(new FileReader(file, StandardCharsets.UTF_8))) {
            List<String> header = parseCsvLine(reader.readLine());
            int tIdIdx = header.indexOf("trip_id");
            int arrIdx = header.indexOf("arrival_time");
            int depIdx = header.indexOf("departure_time");
            int sIdIdx = header.indexOf("stop_id");
            int seqIdx = header.indexOf("stop_sequence");

            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                List<String> v = parseCsvLine(line);
                if (v.size() <= Math.max(tIdIdx, Math.max(arrIdx, Math.max(depIdx, Math.max(sIdIdx, seqIdx))))) continue;

                String tripId = v.get(tIdIdx);
                String arrStr = v.get(arrIdx);
                String depStr = v.get(depIdx);
                String stopId = v.get(sIdIdx);
                int seq = Integer.parseInt(v.get(seqIdx));

                int arrSec = parseGtfsTimeToSeconds(arrStr);
                int depSec = parseGtfsTimeToSeconds(depStr);

                GtfsStopTime st = GtfsStopTime.builder()
                        .tripId(tripId)
                        .arrivalTime(arrStr)
                        .departureTime(depStr)
                        .arrivalSeconds(arrSec)
                        .departureSeconds(depSec)
                        .stopId(stopId)
                        .stopSequence(seq)
                        .build();

                stopTimesByTrip.computeIfAbsent(tripId, k -> new ArrayList<>()).add(st);
            }
        }

        // Sort stop times by stop_sequence
        for (List<GtfsStopTime> list : stopTimesByTrip.values()) {
            list.sort(Comparator.comparingInt(GtfsStopTime::getStopSequence));
        }
    }

    private void buildAccelerationIndexes() {
        for (Map.Entry<String, List<GtfsStopTime>> entry : stopTimesByTrip.entrySet()) {
            String tripId = entry.getKey();
            for (GtfsStopTime st : entry.getValue()) {
                String parentId = stopIdToParentStationId.get(st.getStopId());
                if (parentId != null) {
                    tripsByParentStation.computeIfAbsent(parentId, k -> ConcurrentHashMap.newKeySet()).add(tripId);
                }
            }
        }
    }

    private int parseGtfsTimeToSeconds(String timeStr) {
        if (timeStr == null || timeStr.isBlank()) {
            return 0;
        }
        String[] parts = timeStr.trim().split(":");
        int hours = Integer.parseInt(parts[0]);
        int minutes = parts.length > 1 ? Integer.parseInt(parts[1]) : 0;
        int seconds = parts.length > 2 ? Integer.parseInt(parts[2]) : 0;
        return hours * 3600 + minutes * 60 + seconds;
    }

    private void indexStationName(String name, String stationId) {
        String norm = normalize(name);
        normalizedNameToStationId.put(norm, stationId);
        // Also index without hyphens / spaces
        normalizedNameToStationId.put(norm.replace("-", "").replace(" ", ""), stationId);
    }

    private String cleanStationName(String raw) {
        if (raw == null) return "";
        return raw.trim()
                .replace("Casa Voyageurs", "Casa-Voyageurs")
                .replace("Casa Port", "Casa-Port")
                .replace("Casa Oasis", "Casa-Oasis")
                .replace("Rabat Agdal", "Rabat-Agdal")
                .replace("Rabat Ville", "Rabat-Ville")
                .replace("Tanger Ville", "Tanger-Ville")
                .replace("KǸnitra", "Kénitra")
                .replace("Knitra", "Kénitra")
                .replace("Mekns", "Meknès")
                .replace("SalǸ", "Salé")
                .replace("Sal", "Salé");
    }

    private String deriveCity(String stationName) {
        if (stationName == null) return "Maroc";
        String s = stationName.toLowerCase(Locale.ROOT);
        if (s.contains("casa") || s.contains("oasis") || s.contains("port")) return "Casablanca";
        if (s.contains("rabat") || s.contains("agdal") || s.contains("riad")) return "Rabat";
        if (s.contains("tanger")) return "Tanger";
        if (s.contains("marrakech")) return "Marrakech";
        if (s.contains("fès") || s.contains("fes")) return "Fès";
        if (s.contains("meknès") || s.contains("meknes")) return "Meknès";
        if (s.contains("kénitra") || s.contains("kenitra")) return "Kénitra";
        if (s.contains("oujda")) return "Oujda";
        if (s.contains("nador")) return "Nador";
        if (s.contains("salé") || s.contains("sale")) return "Salé";
        if (s.contains("settat")) return "Settat";
        if (s.contains("safi")) return "Safi";
        if (s.contains("khouribga")) return "Khouribga";
        if (s.contains("taza")) return "Taza";
        if (s.contains("mohammedia")) return "Mohammedia";
        return stationName;
    }

    private String normalize(String input) {
        if (input == null) return "";
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]", "");
        return normalized;
    }

    private List<String> parseCsvLine(String line) {
        if (line == null) return Collections.emptyList();
        // Remove UTF-8 BOM if present
        if (line.startsWith("\uFEFF")) {
            line = line.substring(1);
        }
        List<String> result = new ArrayList<>();
        StringBuilder cur = new StringBuilder();
        boolean inQuotes = false;
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            if (c == '\"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                result.add(cur.toString().trim());
                cur.setLength(0);
            } else {
                cur.append(c);
            }
        }
        result.add(cur.toString().trim());
        return result;
    }

    private void clear() {
        this.loaded = false;
        stationsById.clear();
        stopIdToParentStationId.clear();
        normalizedNameToStationId.clear();
        routesById.clear();
        tripsById.clear();
        stopTimesByTrip.clear();
        calendarByServiceId.clear();
        calendarDatesByServiceAndDate.clear();
        tripsByParentStation.clear();
        earliestCalendarDate = null;
        latestCalendarDate = null;
    }
}
