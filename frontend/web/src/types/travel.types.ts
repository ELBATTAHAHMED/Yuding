export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  popularRank?: number;
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

export interface HotelOffer {
  id: string;
  name: string;
  city: string;
  country: string;
  type: 'HOTEL' | 'APARTMENT' | 'VACATION_HOME';
  pricePerNight: number;
  currency: string;
  rating: number;
  imageUrl?: string;
  address?: string;
}

export interface ActivityOffer {
  id: string;
  title: string;
  city: string;
  country: string;
  category: string;
  price: number;
  currency: string;
  durationHours?: number;
  imageUrl?: string;
  description?: string;
}

export interface TransferOffer {
  id: string;
  type: 'TAXI' | 'TRAIN' | 'CAR_RENTAL';
  vehicleModel?: string;
  departureCity: string;
  arrivalCity?: string;
  price: number;
  currency: string;
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

export interface HotelSearchRequest {
  destination: string;
  checkIn: string;       // YYYY-MM-DD
  checkOut: string;      // YYYY-MM-DD
  rooms?: number;
  adults?: number;
  children?: number;
  propertyType?: string;
  currency?: string;
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

