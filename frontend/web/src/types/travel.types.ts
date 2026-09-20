export interface Destination {
  id: string;
  name: string;
  country: string;
  description: string;
  imageUrl: string;
  popularRank?: number;
}

export interface FlightOffer {
  id: string;
  airline: string;
  flightNumber: string;
  origin: string;
  originCountry?: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: number;
  currency: string;
  availableSeats: number;
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
