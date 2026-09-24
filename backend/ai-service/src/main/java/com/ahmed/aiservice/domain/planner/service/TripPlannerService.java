package com.ahmed.aiservice.domain.planner.service;

import com.ahmed.aiservice.client.InternalTravelClient;
import com.ahmed.aiservice.domain.planner.dto.*;
import com.ahmed.aiservice.domain.planner.entity.TripPlanDayEntity;
import com.ahmed.aiservice.domain.planner.entity.TripPlanEntity;
import com.ahmed.aiservice.domain.planner.entity.TripPlanItemEntity;
import com.ahmed.aiservice.domain.planner.repository.TripPlanDayRepository;
import com.ahmed.aiservice.domain.planner.repository.TripPlanItemRepository;
import com.ahmed.aiservice.domain.planner.repository.TripPlanRepository;
import com.ahmed.aiservice.domain.rag.model.RetrievedChunk;
import com.ahmed.aiservice.domain.rag.service.KnowledgeRetrievalService;
import com.ahmed.aiservice.domain.util.ReferenceGenerator;
import com.ahmed.aiservice.dto.AiSourceDto;
import com.ahmed.aiservice.exception.AiProviderException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Slf4j
@RequiredArgsConstructor
public class TripPlannerService {

    private final InternalTravelClient travelClient;
    private final KnowledgeRetrievalService knowledgeRetrievalService;
    private final TripPlanRepository tripPlanRepository;
    private final TripPlanDayRepository tripPlanDayRepository;
    private final TripPlanItemRepository tripPlanItemRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public TripPlanDto planTrip(TripPlanRequest request, UUID userId) {
        validateRequest(request);

        log.info("Starting Trip Planner orchestration for user {}: {} -> {}, dates: {} to {}, budget: {} {}",
                userId, request.getOrigin(), request.getDestination(),
                request.getStartDate(), request.getEndDate(), request.getBudget(), request.getBudgetCurrency());

        long numberOfDays = ChronoUnit.DAYS.between(request.getStartDate(), request.getEndDate()) + 1;
        long numberOfNights = Math.max(1, numberOfDays - 1);

        // 1. Gather live candidates concurrently / safely
        List<CandidateItem> flightCandidates = searchFlightCandidates(request);
        List<CandidateItem> hotelCandidates = searchHotelCandidates(request, numberOfNights);
        List<CandidateItem> activityCandidates = searchActivityCandidates(request);
        List<CandidateItem> transferCandidates = searchTransferCandidates(request);
        String weatherInfo = fetchWeatherInfo(request);
        List<AiSourceDto> knowledgeSources = fetchDestinationKnowledge(request.getDestination());

        // 2. Select candidates (constrained to returned candidate pool)
        CandidateItem selectedFlight = selectBestFlight(flightCandidates, request);
        CandidateItem selectedHotel = selectBestHotel(hotelCandidates, request);
        CandidateItem selectedTransfer = transferCandidates.isEmpty() ? null : transferCandidates.get(0);

        // 3. Compute Budget using BigDecimal
        BigDecimal budget = request.getBudget();
        String budgetCurrency = request.getBudgetCurrency() != null ? request.getBudgetCurrency().toUpperCase(Locale.ROOT) : "MAD";

        BigDecimal pricedTotal = BigDecimal.ZERO;
        int unpricedCount = 0;
        List<String> warnings = new ArrayList<>();

        if (selectedFlight != null && selectedFlight.price() != null) {
            BigDecimal flightCost = convertAmount(selectedFlight.price(), selectedFlight.currency(), budgetCurrency)
                    .multiply(BigDecimal.valueOf(request.getTravelers()));
            pricedTotal = pricedTotal.add(flightCost);
        } else if (flightCandidates.isEmpty()) {
            warnings.add("Aucun vol direct ou avec escale trouvé pour les dates demandées.");
            unpricedCount++;
        }

        if (selectedHotel != null && selectedHotel.price() != null) {
            BigDecimal hotelCost = convertAmount(selectedHotel.price(), selectedHotel.currency(), budgetCurrency)
                    .multiply(BigDecimal.valueOf(numberOfNights));
            pricedTotal = pricedTotal.add(hotelCost);
        } else if (hotelCandidates.isEmpty()) {
            warnings.add("Aucun hébergement disponible trouvé pour les dates de séjour.");
            unpricedCount++;
        }

        if (selectedTransfer != null && selectedTransfer.price() != null) {
            BigDecimal transferCost = convertAmount(selectedTransfer.price(), selectedTransfer.currency(), budgetCurrency);
            pricedTotal = pricedTotal.add(transferCost);
        }

        // Schedule activities across days
        List<ScheduledDay> scheduledDays = scheduleDays(request, (int) numberOfDays, activityCandidates, weatherInfo, budgetCurrency);
        for (ScheduledDay sd : scheduledDays) {
            for (CandidateItem act : sd.activities) {
                if (act.price() != null) {
                    BigDecimal actCost = convertAmount(act.price(), act.currency(), budgetCurrency)
                            .multiply(BigDecimal.valueOf(request.getTravelers()));
                    pricedTotal = pricedTotal.add(actCost);
                } else {
                    unpricedCount++;
                }
            }
        }

        BigDecimal remainingBudget = budget.subtract(pricedTotal);
        String budgetStatus;
        if (unpricedCount > 0) {
            budgetStatus = "PARTIALLY_PRICED";
        } else if (remainingBudget.compareTo(BigDecimal.ZERO) >= 0) {
            budgetStatus = "WITHIN_BUDGET";
        } else {
            budgetStatus = "OVER_BUDGET";
        }

        // 4. Persist Trip Plan to DB
        String publicRef = ReferenceGenerator.generateTripReference();
        String title = "Voyage " + request.getDestination() + " — " + numberOfDays + " jours";
        String summary = String.format("Itinéraire personnalisé pour %d voyageur(s) de %s à %s du %s au %s (Budget: %s %s).",
                request.getTravelers(), request.getOrigin(), request.getDestination(),
                request.getStartDate(), request.getEndDate(), budget.toPlainString(), budgetCurrency);

        TripPlanEntity planEntity = TripPlanEntity.builder()
                .publicReference(publicRef)
                .userId(userId)
                .origin(request.getOrigin())
                .destination(request.getDestination())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .travelers(request.getTravelers())
                .budget(budget)
                .budgetCurrency(budgetCurrency)
                .pricedTotal(pricedTotal)
                .remainingBudget(remainingBudget)
                .unpricedItemsCount(unpricedCount)
                .budgetStatus(budgetStatus)
                .title(title)
                .summary(summary)
                .preferences(request.getPreferences() != null ? String.join(", ", request.getPreferences()) : "")
                .weatherSummary(weatherInfo)
                .dataFreshness("FRESH")
                .version(1)
                .build();

        TripPlanEntity savedPlan = tripPlanRepository.save(planEntity);

        // Save Days
        List<TripPlanDayEntity> dayEntities = new ArrayList<>();
        for (ScheduledDay sd : scheduledDays) {
            TripPlanDayEntity de = TripPlanDayEntity.builder()
                    .tripPlan(savedPlan)
                    .dayNumber(sd.dayNumber)
                    .dayDate(sd.date)
                    .theme(sd.theme)
                    .weatherForecast(sd.weather)
                    .estimatedCost(sd.estimatedCost)
                    .morningActivities(sd.morningTitle)
                    .afternoonActivities(sd.afternoonTitle)
                    .eveningActivities(sd.eveningTitle)
                    .build();
            dayEntities.add(tripPlanDayRepository.save(de));
        }

        // Save Items
        List<TripPlanItemEntity> itemEntities = new ArrayList<>();
        if (selectedFlight != null) {
            itemEntities.add(saveItem(savedPlan, "FLIGHT", selectedFlight, budgetCurrency, null, "ALL_DAY"));
        }
        if (selectedHotel != null) {
            itemEntities.add(saveItem(savedPlan, "HOTEL", selectedHotel, budgetCurrency, null, "ALL_DAY"));
        }
        if (selectedTransfer != null) {
            itemEntities.add(saveItem(savedPlan, "TRANSFER", selectedTransfer, budgetCurrency, 1, "MORNING"));
        }
        for (ScheduledDay sd : scheduledDays) {
            for (CandidateItem act : sd.activities) {
                itemEntities.add(saveItem(savedPlan, "ACTIVITY", act, budgetCurrency, sd.dayNumber, act.slot()));
            }
        }

        log.info("Trip Plan persisted: ref={}, status={}, pricedTotal={} {}, unpricedCount={}",
                publicRef, budgetStatus, pricedTotal, budgetCurrency, unpricedCount);

        return toDto(savedPlan, dayEntities, itemEntities, knowledgeSources, warnings);
    }

    @Transactional(readOnly = true)
    public List<TripPlanDto> getUserTripPlans(UUID userId) {
        List<TripPlanEntity> list = tripPlanRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(this::loadFullDto).toList();
    }

    @Transactional(readOnly = true)
    public TripPlanDto getTripPlanByReference(String publicReference, UUID userId) {
        TripPlanEntity entity = tripPlanRepository.findByPublicReferenceAndUserId(publicReference, userId)
                .orElseThrow(() -> new AiProviderException("Plan de voyage introuvable ou non autorisé", "TRIP_PLAN_NOT_FOUND", false, HttpStatus.NOT_FOUND));

        return loadFullDto(entity);
    }

    @Transactional
    public TripPlanDto refreshTripPlan(String publicReference, UUID userId) {
        TripPlanEntity existing = tripPlanRepository.findByPublicReferenceAndUserId(publicReference, userId)
                .orElseThrow(() -> new AiProviderException("Plan de voyage introuvable ou non autorisé", "TRIP_PLAN_NOT_FOUND", false, HttpStatus.NOT_FOUND));

        TripPlanRequest req = TripPlanRequest.builder()
                .origin(existing.getOrigin())
                .destination(existing.getDestination())
                .startDate(existing.getStartDate())
                .endDate(existing.getEndDate())
                .travelers(existing.getTravelers())
                .budget(existing.getBudget())
                .budgetCurrency(existing.getBudgetCurrency())
                .preferences(existing.getPreferences() != null ? Arrays.asList(existing.getPreferences().split(",\\s*")) : Collections.emptyList())
                .build();

        // Delete old child items & days
        tripPlanDayRepository.deleteAll(tripPlanDayRepository.findByTripPlanIdOrderByDayNumberAsc(existing.getId()));
        tripPlanItemRepository.deleteAll(tripPlanItemRepository.findByTripPlanId(existing.getId()));

        TripPlanDto freshDto = planTrip(req, userId);
        return freshDto;
    }

    private TripPlanDto loadFullDto(TripPlanEntity plan) {
        List<TripPlanDayEntity> days = tripPlanDayRepository.findByTripPlanIdOrderByDayNumberAsc(plan.getId());
        List<TripPlanItemEntity> items = tripPlanItemRepository.findByTripPlanId(plan.getId());
        List<AiSourceDto> sources = fetchDestinationKnowledge(plan.getDestination());
        return toDto(plan, days, items, sources, Collections.emptyList());
    }

    private void validateRequest(TripPlanRequest request) {
        if (request == null) {
            throw new AiProviderException("Le corps de la requête est obligatoire", "PLANNER_INVALID_REQUEST", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getOrigin() == null || request.getOrigin().trim().isBlank()) {
            throw new AiProviderException("La ville de départ (origin) est obligatoire", "PLANNER_MISSING_ORIGIN", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getDestination() == null || request.getDestination().trim().isBlank()) {
            throw new AiProviderException("La destination est obligatoire pour générer un plan de voyage chiffré", "PLANNER_MISSING_DESTINATION", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getStartDate() == null || request.getEndDate() == null) {
            throw new AiProviderException("Les dates de voyage (startDate et endDate) sont obligatoires", "PLANNER_MISSING_DATES", false, HttpStatus.BAD_REQUEST);
        }
        if (!request.getStartDate().isBefore(request.getEndDate()) && !request.getStartDate().isEqual(request.getEndDate())) {
            throw new AiProviderException("La date de départ doit être antérieure ou égale à la date de fin", "PLANNER_INVALID_DATES", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getTravelers() < 1) {
            throw new AiProviderException("Le nombre de voyageurs doit être supérieur ou égal à 1", "PLANNER_INVALID_TRAVELERS", false, HttpStatus.BAD_REQUEST);
        }
        if (request.getBudget() == null || request.getBudget().compareTo(BigDecimal.ZERO) <= 0) {
            throw new AiProviderException("Le budget doit être un montant positif", "PLANNER_INVALID_BUDGET", false, HttpStatus.BAD_REQUEST);
        }
    }

    // ---------------- Candidate Searches ----------------

    private List<CandidateItem> searchFlightCandidates(TripPlanRequest request) {
        List<CandidateItem> candidates = new ArrayList<>();
        try {
            Map<String, Object> req = Map.of(
                    "origin", request.getOrigin(),
                    "destination", request.getDestination(),
                    "departureDate", request.getStartDate().toString(),
                    "returnDate", request.getEndDate().toString(),
                    "adults", request.getTravelers()
            );
            JsonNode res = travelClient.searchFlights(req);
            if (res != null && res.isArray()) {
                for (JsonNode f : res) {
                    String id = f.path("id").asText(f.path("flightNumber").asText(UUID.randomUUID().toString()));
                    String airline = f.path("airline").asText("Compagnie aérienne");
                    String flightNum = f.path("flightNumber").asText("");
                    BigDecimal price = f.has("price") ? new BigDecimal(f.path("price").asText()) : null;
                    String currency = f.path("currency").asText("MAD");
                    String title = "Vol " + airline + " " + flightNum;
                    candidates.add(new CandidateItem(id, "FLIGHT", title, "Scrappa/Amadeus", price, currency, "ALL_DAY"));
                }
            }
        } catch (Exception e) {
            log.warn("Search flights failed: {}", e.getMessage());
        }
        return candidates;
    }

    private List<CandidateItem> searchHotelCandidates(TripPlanRequest request, long numberOfNights) {
        List<CandidateItem> candidates = new ArrayList<>();
        try {
            Map<String, Object> req = Map.of(
                    "destination", request.getDestination(),
                    "checkIn", request.getStartDate().toString(),
                    "checkOut", request.getEndDate().toString(),
                    "adults", request.getTravelers(),
                    "rooms", 1
            );
            JsonNode res = travelClient.searchHotels(req);
            if (res != null && res.isArray()) {
                for (JsonNode h : res) {
                    String id = h.path("id").asText(UUID.randomUUID().toString());
                    String name = h.path("name").asText("Hôtel");
                    BigDecimal price = h.has("price") ? new BigDecimal(h.path("price").asText()) : (h.has("pricePerNight") ? new BigDecimal(h.path("pricePerNight").asText()) : null);
                    String currency = h.path("currency").asText("MAD");
                    candidates.add(new CandidateItem(id, "HOTEL", name, "Nuitee/LiteAPI", price, currency, "ALL_DAY"));
                }
            }
        } catch (Exception e) {
            log.warn("Search hotels failed: {}", e.getMessage());
        }
        return candidates;
    }

    private List<CandidateItem> searchActivityCandidates(TripPlanRequest request) {
        List<CandidateItem> candidates = new ArrayList<>();
        try {
            Map<String, Object> req = Map.of(
                    "destination", request.getDestination()
            );
            JsonNode res = travelClient.searchActivities(req);
            if (res != null && res.isArray()) {
                for (JsonNode a : res) {
                    String id = a.path("id").asText(UUID.randomUUID().toString());
                    String title = a.path("name").asText(a.path("title").asText("Visite touristique"));
                    BigDecimal price = a.has("price") ? new BigDecimal(a.path("price").asText()) : null;
                    String currency = a.path("currency").asText("MAD");
                    candidates.add(new CandidateItem(id, "ACTIVITY", title, "HBX", price, currency, "AFTERNOON"));
                }
            }
        } catch (Exception e) {
            log.warn("Search activities failed: {}", e.getMessage());
        }
        return candidates;
    }

    private List<CandidateItem> searchTransferCandidates(TripPlanRequest request) {
        List<CandidateItem> candidates = new ArrayList<>();
        try {
            Map<String, Object> req = Map.of(
                    "pickup", request.getDestination() + " Airport",
                    "dropoff", request.getDestination() + " Centre-Ville",
                    "date", request.getStartDate().toString(),
                    "time", "12:00"
            );
            JsonNode res = travelClient.searchTransfers(req);
            if (res != null && res.isArray()) {
                for (JsonNode t : res) {
                    String id = t.path("id").asText(UUID.randomUUID().toString());
                    String vehicle = t.path("vehicleType").asText("Transfert privé / Berline");
                    BigDecimal price = t.has("price") ? new BigDecimal(t.path("price").asText()) : null;
                    String currency = t.path("currency").asText("MAD");
                    candidates.add(new CandidateItem(id, "TRANSFER", "Transfert : " + vehicle, "TransfersProvider", price, currency, "MORNING"));
                }
            }
        } catch (Exception e) {
            log.warn("Search transfers failed: {}", e.getMessage());
        }
        return candidates;
    }

    private String fetchWeatherInfo(TripPlanRequest request) {
        LocalDate today = LocalDate.now();
        long daysUntilTrip = ChronoUnit.DAYS.between(today, request.getStartDate());

        if (daysUntilTrip > 14 || request.getEndDate().isBefore(today)) {
            return "Dates au-delà de l'horizon de prévision météorologique (max 14 jours). Prévisions saisonnières disponibles via le guide Yuding.";
        }

        try {
            JsonNode geo = travelClient.geocode(request.getDestination());
            if (geo != null && geo.isArray() && !geo.isEmpty()) {
                double lat = geo.get(0).path("lat").asDouble();
                double lon = geo.get(0).path("lon").asDouble();
                JsonNode weather = travelClient.getWeather(lat, lon, 7);
                if (weather != null && weather.has("current")) {
                    double temp = weather.path("current").path("temperature").asDouble();
                    String condition = weather.path("current").path("weatherDescription").asText("Ensoleillé");
                    return String.format("Météo actuelle : %.1f °C, %s", temp, condition);
                }
            }
        } catch (Exception e) {
            log.warn("Weather fetch failed for destination {}: {}", request.getDestination(), e.getMessage());
        }

        return "Données météorologiques indisponibles actuellement.";
    }

    private List<AiSourceDto> fetchDestinationKnowledge(String destination) {
        List<AiSourceDto> sources = new ArrayList<>();
        if (knowledgeRetrievalService == null) return sources;
        try {
            List<RetrievedChunk> chunks = knowledgeRetrievalService.retrieve(destination + " guide visite", "DESTINATION_INFO", 3);
            for (RetrievedChunk c : chunks) {
                sources.add(new AiSourceDto(c.getDocumentReference(), c.getTitle(), c.getSectionTitle(), c.getCategory()));
            }
        } catch (Exception e) {
            log.warn("RAG destination retrieval failed for {}: {}", destination, e.getMessage());
        }
        return sources;
    }

    private CandidateItem selectBestFlight(List<CandidateItem> flights, TripPlanRequest req) {
        if (flights.isEmpty()) return null;
        // Prefer lowest priced flight
        return flights.stream()
                .filter(f -> f.price() != null)
                .min(Comparator.comparing(CandidateItem::price))
                .orElse(flights.get(0));
    }

    private CandidateItem selectBestHotel(List<CandidateItem> hotels, TripPlanRequest req) {
        if (hotels.isEmpty()) return null;
        return hotels.stream()
                .filter(h -> h.price() != null)
                .min(Comparator.comparing(CandidateItem::price))
                .orElse(hotels.get(0));
    }

    private BigDecimal convertAmount(BigDecimal amount, String from, String to) {
        if (amount == null) return BigDecimal.ZERO;
        if (from == null || to == null || from.equalsIgnoreCase(to)) {
            return amount;
        }
        try {
            JsonNode res = travelClient.convertCurrency(amount, from, to);
            if (res != null && res.has("convertedAmount")) {
                return new BigDecimal(res.path("convertedAmount").asText()).setScale(2, RoundingMode.HALF_UP);
            }
        } catch (Exception e) {
            log.warn("Currency conversion from {} to {} failed: {}", from, to, e.getMessage());
        }
        return amount; // Fallback to raw amount if rate unavailable
    }

    private List<ScheduledDay> scheduleDays(TripPlanRequest request, int totalDays, List<CandidateItem> activities, String weatherInfo, String budgetCurrency) {
        List<ScheduledDay> days = new ArrayList<>();
        int actIdx = 0;

        for (int d = 1; d <= totalDays; d++) {
            LocalDate date = request.getStartDate().plusDays(d - 1);
            String theme;
            String morningTitle = "";
            String afternoonTitle = "";
            String eveningTitle = "Dîner gastronomique local et détente";
            List<CandidateItem> dayActs = new ArrayList<>();
            BigDecimal dayCost = BigDecimal.ZERO;

            if (d == 1) {
                theme = "Arrivée et première découverte";
                morningTitle = "Arrivée à destination et installation à l'hôtel";
                if (actIdx < activities.size()) {
                    CandidateItem act = activities.get(actIdx++);
                    afternoonTitle = act.title();
                    dayActs.add(new CandidateItem(act.id(), act.type(), act.title(), act.provider(), act.price(), act.currency(), "AFTERNOON"));
                    if (act.price() != null) dayCost = dayCost.add(act.price());
                } else {
                    afternoonTitle = "Balade dans les quartiers historiques";
                }
            } else if (d == totalDays) {
                theme = "Dernières visites et départ";
                morningTitle = "Achat de souvenirs et préparation des bagages";
                afternoonTitle = "Transfert vers l'aéroport et vol retour";
            } else {
                theme = "Exploration culturelle et détente";
                if (actIdx < activities.size()) {
                    CandidateItem act = activities.get(actIdx++);
                    morningTitle = act.title();
                    dayActs.add(new CandidateItem(act.id(), act.type(), act.title(), act.provider(), act.price(), act.currency(), "MORNING"));
                    if (act.price() != null) dayCost = dayCost.add(act.price());
                } else {
                    morningTitle = "Visite d'un musée ou monument emblématique";
                }

                if (actIdx < activities.size()) {
                    CandidateItem act = activities.get(actIdx++);
                    afternoonTitle = act.title();
                    dayActs.add(new CandidateItem(act.id(), act.type(), act.title(), act.provider(), act.price(), act.currency(), "AFTERNOON"));
                    if (act.price() != null) dayCost = dayCost.add(act.price());
                } else {
                    afternoonTitle = "Expérience culinaire et découverte locale";
                }
            }

            days.add(new ScheduledDay(d, date, theme, weatherInfo, dayCost, morningTitle, afternoonTitle, eveningTitle, dayActs));
        }

        return days;
    }

    private TripPlanItemEntity saveItem(TripPlanEntity plan, String type, CandidateItem item, String budgetCurrency, Integer dayNumber, String slot) {
        BigDecimal convPrice = convertAmount(item.price(), item.currency(), budgetCurrency);
        TripPlanItemEntity e = TripPlanItemEntity.builder()
                .tripPlan(plan)
                .itemType(type)
                .title(item.title())
                .provider(item.provider())
                .offerReference(item.id())
                .price(item.price())
                .currency(item.currency())
                .priceInBudgetCurrency(convPrice)
                .isPriced(item.price() != null)
                .dayNumber(dayNumber)
                .slot(slot)
                .build();
        return tripPlanItemRepository.save(e);
    }

    private TripPlanDto toDto(TripPlanEntity plan, List<TripPlanDayEntity> days, List<TripPlanItemEntity> items, List<AiSourceDto> sources, List<String> warnings) {
        TripPlanItemDto flight = null;
        TripPlanItemDto returnFlight = null;
        TripPlanItemDto hotel = null;
        TripPlanItemDto transfer = null;

        for (TripPlanItemEntity it : items) {
            if ("FLIGHT".equals(it.getItemType()) && flight == null) {
                flight = toItemDto(it);
            } else if ("FLIGHT".equals(it.getItemType())) {
                returnFlight = toItemDto(it);
            } else if ("HOTEL".equals(it.getItemType())) {
                hotel = toItemDto(it);
            } else if ("TRANSFER".equals(it.getItemType())) {
                transfer = toItemDto(it);
            }
        }

        List<TripPlanDayDto> dayDtos = new ArrayList<>();
        for (TripPlanDayEntity d : days) {
            List<TripPlanItemDto> dayItems = items.stream()
                    .filter(i -> "ACTIVITY".equals(i.getItemType()) && i.getDayNumber() != null && i.getDayNumber() == d.getDayNumber())
                    .map(this::toItemDto)
                    .toList();

            List<TripPlanItemDto> morning = dayItems.stream().filter(i -> "MORNING".equalsIgnoreCase(i.getSlot())).toList();
            List<TripPlanItemDto> afternoon = dayItems.stream().filter(i -> "AFTERNOON".equalsIgnoreCase(i.getSlot())).toList();
            List<TripPlanItemDto> evening = dayItems.stream().filter(i -> "EVENING".equalsIgnoreCase(i.getSlot())).toList();

            dayDtos.add(TripPlanDayDto.builder()
                    .id(d.getId())
                    .dayNumber(d.getDayNumber())
                    .date(d.getDayDate())
                    .theme(d.getTheme())
                    .weatherForecast(d.getWeatherForecast())
                    .estimatedCost(d.getEstimatedCost())
                    .morning(new ArrayList<>(morning))
                    .afternoon(new ArrayList<>(afternoon))
                    .evening(new ArrayList<>(evening))
                    .build());
        }

        return TripPlanDto.builder()
                .reference(plan.getPublicReference())
                .title(plan.getTitle())
                .summary(plan.getSummary())
                .origin(plan.getOrigin())
                .destination(plan.getDestination())
                .startDate(plan.getStartDate())
                .endDate(plan.getEndDate())
                .travelers(plan.getTravelers())
                .budget(plan.getBudget())
                .budgetCurrency(plan.getBudgetCurrency())
                .pricedTotal(plan.getPricedTotal())
                .remainingBudget(plan.getRemainingBudget())
                .unpricedItemsCount(plan.getUnpricedItemsCount())
                .budgetStatus(plan.getBudgetStatus())
                .dataFreshness(plan.getDataFreshness())
                .version(plan.getVersion())
                .createdAt(plan.getCreatedAt())
                .updatedAt(plan.getUpdatedAt())
                .flight(flight)
                .returnFlight(returnFlight)
                .hotel(hotel)
                .transfer(transfer)
                .days(dayDtos)
                .weatherSummary(plan.getWeatherSummary())
                .sources(sources)
                .warnings(warnings)
                .build();
    }

    private TripPlanItemDto toItemDto(TripPlanItemEntity it) {
        return TripPlanItemDto.builder()
                .id(it.getId())
                .type(it.getItemType())
                .title(it.getTitle())
                .provider(it.getProvider())
                .offerReference(it.getOfferReference())
                .startTime(it.getStartTime())
                .endTime(it.getEndTime())
                .price(it.getPrice())
                .currency(it.getCurrency())
                .priceInBudgetCurrency(it.getPriceInBudgetCurrency())
                .isPriced(it.isPriced())
                .dayNumber(it.getDayNumber())
                .slot(it.getSlot())
                .detailsJson(it.getDetailsJson())
                .build();
    }

    private record CandidateItem(
            String id,
            String type,
            String title,
            String provider,
            BigDecimal price,
            String currency,
            String slot
    ) {}

    private record ScheduledDay(
            int dayNumber,
            LocalDate date,
            String theme,
            String weather,
            BigDecimal estimatedCost,
            String morningTitle,
            String afternoonTitle,
            String eveningTitle,
            List<CandidateItem> activities
    ) {}
}
