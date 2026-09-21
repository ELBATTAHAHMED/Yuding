import { apiClient } from '../lib/api-client.ts';
import type {
  ActivityOffer,
  ActivitySearchRequest,
  Airport,
  Destination,
  FlightOffer,
  FlightSearchRequest,
  HotelOffer,
  HotelSearchRequest,
  OfferRevalidationResult,
  RevalidateOfferRequest,
  TrainOffer,
  TrainSearchRequest,
  TrainStation,
  TransferOffer,
  TransferSearchRequest,
  TravelSearchResponse,
} from '../types/travel.types.ts';

function getDefaultDate(daysAhead: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
}

export const travelService = {
  getPopularDestinations(): Destination[] {
    return [
      {
        id: '1',
        name: 'CHEFCHAOUEN',
        country: 'MAROC',
        description: 'Chefchaouen, la perle bleue du Rif, offre des ruelles étroites, des maisons blanches et bleues, et une atmosphère paisible.',
        imageUrl: '/image/chefchaoun.jpeg',
        popularRank: 1,
      },
      {
        id: '2',
        name: 'DAKHLA',
        country: 'MAROC',
        description: 'Dakhla, une destination de sports nautiques de premier plan avec un paysage époustouflant de désert et de mer, et des fruits de mer délicieux.',
        imageUrl: '/image/Dakhla.jpg',
        popularRank: 2,
      },
      {
        id: '3',
        name: 'MARRAKECH',
        country: 'MAROC',
        description: 'Marrakech, une ville animée et vibrante qui offre une expérience culturelle unique avec ses souks colorés, ses palais majestueux et ses jardins luxuriants.',
        imageUrl: '/image/marrakech.jpg',
        popularRank: 3,
      },
    ];
  },

  /**
   * Fetch normalized airport directory via Gateway -> travel-service (/travel/airports)
   * Used for search autocomplete and selection.
   */
  async getAirports(): Promise<Airport[]> {
    return apiClient.get<Airport[]>('/travel/airports');
  },

  /**
   * Search flights via Gateway -> travel-service (/travel/flights/search)
   * Supports both validated FlightSearchRequest and legacy positional arguments.
   */
  async searchFlights(
    queryOrOriginCountry?: FlightSearchRequest | string,
    originCity?: string,
    destination?: string
  ): Promise<TravelSearchResponse<FlightOffer>> {
    let payload: FlightSearchRequest;

    if (queryOrOriginCountry && typeof queryOrOriginCountry === 'object') {
      payload = {
        origin: queryOrOriginCountry.origin || '',
        destination: queryOrOriginCountry.destination || '',
        departureDate: queryOrOriginCountry.departureDate || getDefaultDate(7),
        returnDate: queryOrOriginCountry.returnDate,
        adults: queryOrOriginCountry.adults ?? 1,
        children: queryOrOriginCountry.children ?? 0,
        infants: queryOrOriginCountry.infants ?? 0,
        travelClass: queryOrOriginCountry.travelClass ?? 'ECONOMY',
        nonStop: queryOrOriginCountry.nonStop ?? false,
        currency: queryOrOriginCountry.currency ?? 'EUR',
      };
    } else {
      const originCountry = queryOrOriginCountry as string | undefined;
      const origin = originCity || originCountry || '';
      const dest = destination || '';

      payload = {
        origin: origin.trim(),
        destination: dest.trim(),
        departureDate: getDefaultDate(7),
        adults: 1,
        children: 0,
        infants: 0,
        travelClass: 'ECONOMY',
        nonStop: false,
        currency: 'EUR',
      };
    }

    return apiClient.post<TravelSearchResponse<FlightOffer>>(
      '/travel/flights/search',
      payload,
      false,
      { timeoutMs: 35000 }
    );
  },

  /**
   * Search hotels/accommodations via Gateway -> travel-service (/travel/hotels/search)
   * Supports both validated HotelSearchRequest and legacy positional arguments.
   */
  async searchHotels(
    queryOrCountry?: HotelSearchRequest | string,
    city?: string
  ): Promise<TravelSearchResponse<HotelOffer>> {
    let payload: HotelSearchRequest;

    if (queryOrCountry && typeof queryOrCountry === 'object') {
      payload = {
        destination: queryOrCountry.destination || '',
        checkIn: queryOrCountry.checkIn || '',
        checkOut: queryOrCountry.checkOut || '',
        rooms: queryOrCountry.rooms ?? 1,
        adults: queryOrCountry.adults ?? 2,
        children: queryOrCountry.children ?? 0,
        propertyType: queryOrCountry.propertyType ?? 'ALL',
        currency: queryOrCountry.currency ?? 'EUR',
        guestNationality: queryOrCountry.guestNationality ?? 'MA',
        city: queryOrCountry.city,
        countryCode: queryOrCountry.countryCode,
        occupancies: queryOrCountry.occupancies,
      };
    } else {
      const country = queryOrCountry as string | undefined;
      const dest = [city, country].filter(Boolean).join(', ');

      payload = {
        destination: dest,
        checkIn: '',
        checkOut: '',
        rooms: 1,
        adults: 1,
        children: 0,
        propertyType: 'ALL',
        currency: 'EUR',
        guestNationality: 'MA',
      };
    }

    return apiClient.post<TravelSearchResponse<HotelOffer>>(
      '/travel/hotels/search',
      payload,
      false,
      { timeoutMs: 25000 }
    );
  },

  /**
   * Search activities and excursions via Gateway -> travel-service (/travel/activities/search)
   * Supports both validated ActivitySearchRequest and legacy positional arguments.
   */
  async searchActivities(
    queryOrCategory?: ActivitySearchRequest | string,
    city?: string
  ): Promise<TravelSearchResponse<ActivityOffer>> {
    let payload: ActivitySearchRequest;

    if (queryOrCategory && typeof queryOrCategory === 'object') {
      payload = {
        destination: queryOrCategory.destination || 'Marrakech',
        date: queryOrCategory.date || getDefaultDate(5),
        travelers: queryOrCategory.travelers ?? 1,
        category: queryOrCategory.category ?? 'ALL',
        radiusKm: queryOrCategory.radiusKm ?? 25,
        currency: queryOrCategory.currency ?? 'EUR',
      };
    } else {
      const category = queryOrCategory as string | undefined;
      payload = {
        destination: city || 'Marrakech',
        date: getDefaultDate(5),
        travelers: 1,
        category: category || 'ALL',
        radiusKm: 25,
        currency: 'EUR',
      };
    }

    return apiClient.post<TravelSearchResponse<ActivityOffer>>('/travel/activities/search', payload);
  },

  /**
   * Search transfers (taxis, trains, car rentals) via Gateway -> travel-service (/travel/transfers/search)
   * Supports both validated TransferSearchRequest and legacy positional arguments.
   */
  async searchTransfers(
    queryOrType?: TransferSearchRequest | 'TAXI' | 'TRAIN' | 'CAR_RENTAL',
    city?: string
  ): Promise<TravelSearchResponse<TransferOffer>> {
    let payload: TransferSearchRequest;

    if (queryOrType && typeof queryOrType === 'object') {
      payload = {
        pickup: queryOrType.pickup || 'Marrakech Airport (RAK)',
        dropoff: queryOrType.dropoff || 'Marrakech City Center',
        date: queryOrType.date || getDefaultDate(2),
        time: queryOrType.time || '12:00',
        passengers: queryOrType.passengers ?? 1,
        transferType: queryOrType.transferType ?? 'TAXI',
        currency: queryOrType.currency ?? 'EUR',
      };
    } else {
      const type = (queryOrType as 'TAXI' | 'TRAIN' | 'CAR_RENTAL') || 'TAXI';
      const origin = city || 'Aéroport Marrakech-Ménara';
      const destination = type === 'TRAIN' ? 'Casablanca Voyageurs' : 'Centre-ville / Médina';

      payload = {
        pickup: origin,
        dropoff: destination,
        date: getDefaultDate(2),
        time: '12:00',
        passengers: 1,
        transferType: type,
        currency: 'EUR',
      };
    }

    return apiClient.post<TravelSearchResponse<TransferOffer>>('/travel/transfers/search', payload);
  },

  /**
   * Revalidate an offer (price, availability) via Gateway -> travel-service (/travel/offers/revalidate)
   */
  async revalidateOffer(request: RevalidateOfferRequest): Promise<OfferRevalidationResult> {
    return apiClient.post<OfferRevalidationResult>('/travel/offers/revalidate', request);
  },

  /**
   * Get train stations directory via Gateway -> travel-service (/travel/trains/stations)
   */
  async getTrainStations(): Promise<TrainStation[]> {
    return apiClient.get<TrainStation[]>('/travel/trains/stations');
  },

  /**
   * Search train timetable schedules via Gateway -> travel-service (/travel/trains/search)
   */
  async searchTrains(request: TrainSearchRequest): Promise<TravelSearchResponse<TrainOffer>> {
    return apiClient.post<TravelSearchResponse<TrainOffer>>('/travel/trains/search', request);
  },
};

