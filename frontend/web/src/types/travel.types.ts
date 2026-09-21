export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  popularRank?: number;
}

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
}

export interface FlightLeg {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  airlineCode?: string;
  airlineName?: string;
  flightNumber?: string;
  durationMinutes?: number;
  stops?: number;
  aircraft?: string;
}

export type ConversionStatus = 'CONVERTED' | 'IDENTITY' | 'UNAVAILABLE';

/** Immutable provider amount plus optional MAD display conversion returned by travel-service. */
export interface PriceConversionSnapshot {
  providerAmount: number;
  providerCurrency: string;
  exchangeRate?: number;
  displayAmount?: number;
  displayCurrency: string;
  exchangeRateDate?: string;
  exchangeRateProvider?: string;
  conversionStatus: ConversionStatus;
}

export interface FlightOffer {
  offerId: string;
  /** Provider code, e.g. "SCRAPPA". */
  provider?: string;
  /** IATA airline code of primary carrier. */
  airlineCode?: string;
  /** Human-readable airline name. */
  airlineName?: string;
  flightNumber?: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  cabinClass?: string;
  price: number;
  currency: string;
  priceConversion?: PriceConversionSnapshot;
  availableSeats?: number;
  /** Total journey duration in minutes. */
  totalDurationMinutes?: number;
  /** Number of stops (0 = direct). */
  stops?: number;
  /**
   * true = complete itinerary (one-way or round-trip complete).
   * false = outbound only (round-trip starting price stage).
   */
  itineraryComplete?: boolean;
  /** "round_trip_starting" | "round_trip_total" | null */
  priceType?: string;
  /** Opaque token for round-trip second stage — not a bookable token. */
  departureToken?: string;
  legs?: FlightLeg[];
}

export interface HotelRoomOffer {
  offerId: string;
  rateId?: string;
  roomTypeId?: string;
  roomName: string;
  maxOccupancy?: number;
  adultCount?: number;
  childCount?: number;
  boardType?: string;
  boardName?: string;
  bedType?: string;
  refundable?: boolean;
  cancellationDeadline?: string;
  cancellationSummary?: string;
  price: number;
  pricePerNight?: number;
  currency: string;
  priceConversion?: PriceConversionSnapshot;
  pricePerNightConversion?: PriceConversionSnapshot;
}

export interface HotelOffer {
  id?: string;
  offerId: string;
  provider?: string;
  hotelId?: string;
  hotelName?: string;
  name?: string;
  city?: string;
  country?: string;
  destination?: string;
  address?: string;
  type?: string;
  /** Normalized provider-neutral accommodation type when supplied by backend. */
  accommodationType?: 'HOTEL' | 'RIAD' | 'VILLA' | 'HOUSE' | 'APARTMENT';
  /** Legacy/backend alias retained while normalized responses migrate. */
  propertyType?: string;
  starRating?: number;
  reviewScore?: number;
  reviewCount?: number;
  rating?: number;
  pricePerNight: number;
  totalPrice?: number;
  currency: string;
  /** Conversion of the existing per-night headline price. */
  priceConversion?: PriceConversionSnapshot;
  totalPriceConversion?: PriceConversionSnapshot;
  imageUrl?: string;
  availabilityState?: string;
  roomSummary?: string;
  roomOffers?: HotelRoomOffer[];
}

export interface ActivityOffer {
  id?: string;
  offerId?: string;
  provider?: string;
  source?: string;
  title: string;
  city?: string;
  destination?: string;
  country?: string;
  category: string;
  price: number;
  currency: string;
  priceConversion?: PriceConversionSnapshot;
  durationHours?: number;
  imageUrl?: string;
  description?: string;
}

export interface TransferOffer {
  id?: string;
  offerId?: string;
  provider?: string;
  type?: 'TAXI' | 'TRAIN' | 'CAR_RENTAL' | string;
  transferType?: string;
  vehicleModel?: string;
  departureCity?: string;
  arrivalCity?: string;
  pickup?: string;
  dropoff?: string;
  date?: string;
  time?: string;
  price: number;
  currency: string;
  priceConversion?: PriceConversionSnapshot;
  capacity?: number;
}

// ==================== V2 SEARCH CONTRACT MODELS ====================

export interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;   // YYYY-MM-DD
  adults?: number;
  children?: number;
  infants?: number;
  travelClass?: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  nonStop?: boolean;
  currency?: string;
}

export interface RoomOccupancy {
  adults: number;
  childrenAges?: number[];
}

export interface HotelSearchRequest {
  destination: string;
  checkIn: string;       // YYYY-MM-DD
  checkOut: string;      // YYYY-MM-DD
  rooms?: number;
  adults?: number;
  children?: number;
  propertyType?: string;
  currency?: string;
  guestNationality?: string;
  city?: string;
  countryCode?: string;
  occupancies?: RoomOccupancy[];
}

export interface ActivitySearchRequest {
  destination: string;
  date?: string;         // YYYY-MM-DD
  travelers?: number;
  category?: string;
  radiusKm?: number;
  currency?: string;
}

export interface TransferSearchRequest {
  pickup: string;
  dropoff: string;
  date: string;          // YYYY-MM-DD
  time: string;          // HH:mm
  passengers?: number;
  transferType?: 'TAXI' | 'TRAIN' | 'CAR_RENTAL' | 'PRIVATE' | 'SHUTTLE';
  currency?: string;
}

export interface TrainStation {
  id: string;
  onestopId?: string;
  name: string;
  city: string;
  country: string;
  countryCode?: string;
  provider?: string;
  locationType?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
}

export interface TrainStop {
  stopSequence?: number;
  stationId?: string;
  stationName: string;
  arrivalTime?: string;
  departureTime?: string;
}

export interface TrainLeg {
  mode: string;
  operator?: string;
  serviceName?: string;
  origin?: string;
  destination?: string;
  departureTime?: string;
  arrivalTime?: string;
  durationMinutes?: number;
  intermediateStops?: TrainStop[];
  realTime?: boolean;
  cancelled?: boolean;
}

export interface TrainOffer {
  offerId: string;
  provider: string;
  source: string;
  operator: string;
  trainNumber: string;
  routeName: string;
  productType?: string;
  originStation: string;
  originStationId?: string;
  destinationStation: string;
  destinationStationId?: string;
  departureDate: string;
  departureTime: string;
  arrivalTime?: string;
  durationMinutes?: number;
  direct: boolean;
  numberOfTransfers?: number;
  stopsCount: number;
  intermediateStops?: TrainStop[];
  legs?: TrainLeg[];
  price: number | null;
  currency: string;
  dataFreshness?: string;
  feedValidityStart?: string;
  feedValidityEnd?: string;
  officialScheduleUrl?: string;
}

export interface TrainSearchRequest {
  originStation: string;
  destinationStation: string;
  date: string;          // YYYY-MM-DD
  departureTime?: string; // HH:mm
  currency?: string;
  originCoordinates?: string;
  destinationCoordinates?: string;
  originCountryCode?: string;
  destinationCountryCode?: string;
}

export interface TravelSearchResponse<T> {
  searchId: string;
  status: 'SUCCESS' | 'PROVIDER_UNAVAILABLE';
  message: string;
  totalResults: number;
  results: T[];
}

// ==================== V2 OFFER REVALIDATION MODELS ====================

export interface RevalidateOfferRequest {
  offerId: string;
  provider?: string;
  productType: 'FLIGHT' | 'HOTEL' | 'ACTIVITY' | 'TRANSFER';
  originalPrice: number;
  currency: string;
}

export interface OfferRevalidationResult {
  offerId: string;
  provider: string;
  valid: boolean;
  priceChanged: boolean;
  currentPrice: number;
  originalPrice: number;
  currency: string;
  message?: string;
}
