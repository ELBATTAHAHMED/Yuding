import { apiClient } from '@/lib/api-client';
import { ActivityOffer, Destination, FlightOffer, HotelOffer, TransferOffer } from '@/types/travel.types';

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

  async searchHotels(country?: string, city?: string): Promise<HotelOffer[]> {
    try {
      const results = await apiClient.post<any[]>('/apir/hebergements/search', {
        destination: country || '',
        pax: city || '',
      });
      if (Array.isArray(results) && results.length > 0) {
        return results.map((item) => ({
          id: String(item.id || item.idh || Math.random()),
          name: item.nom || item.name || 'Hôtel Yuding',
          city: item.ville || city || 'Marrakech',
          country: item.pays || country || 'Maroc',
          type: item.type || 'HOTEL',
          pricePerNight: item.prix || item.price || 85,
          currency: 'EUR',
          rating: item.rating || 4.5,
          imageUrl: item.image || '/image/hotels.jpg',
        }));
      }
    } catch {
      // Fallback for visual display if backend search service is unseeded
    }

    return [
      {
        id: 'h1',
        name: 'Palais Riad & Spa',
        city: city || 'Marrakech',
        country: country || 'Maroc',
        type: 'HOTEL',
        pricePerNight: 120,
        currency: 'EUR',
        rating: 4.8,
        imageUrl: '/image/hotels.jpg',
      },
      {
        id: 'h2',
        name: 'Villa Vue Océan',
        city: city || 'Dakhla',
        country: country || 'Maroc',
        type: 'VACATION_HOME',
        pricePerNight: 160,
        currency: 'EUR',
        rating: 4.9,
        imageUrl: '/image/maisonsVacances.jpg',
      },
      {
        id: 'h3',
        name: 'Appartement Centre Historique',
        city: city || 'Chefchaouen',
        country: country || 'Maroc',
        type: 'APARTMENT',
        pricePerNight: 65,
        currency: 'EUR',
        rating: 4.6,
        imageUrl: '/image/appartements.jpg',
      },
    ];
  },

  async searchFlights(originCountry?: string, originCity?: string, destination?: string): Promise<FlightOffer[]> {
    try {
      const results = await apiClient.post<any[]>('/apir/transports/search1', {
        pays: originCountry || '',
        ville: originCity || '',
        destination: destination || '',
      });
      if (Array.isArray(results) && results.length > 0) {
        return results.map((item) => ({
          id: String(item.id || item.idt || Math.random()),
          airline: item.compagnie || 'Royal Air Maroc',
          flightNumber: item.numero || 'AT402',
          origin: item.ville || originCity || 'Paris (CDG)',
          originCountry: item.pays || originCountry || 'France',
          destination: item.destination || destination || 'Casablanca (CMN)',
          departureTime: item.depart || '10:30',
          arrivalTime: item.arrivee || '13:45',
          price: item.prix || 180,
          currency: 'EUR',
          availableSeats: item.places || 24,
        }));
      }
    } catch {
      // Fallback
    }

    return [
      {
        id: 'f1',
        airline: 'Royal Air Maroc',
        flightNumber: 'AT402',
        origin: originCity || 'Paris (CDG)',
        destination: destination || 'Casablanca (CMN)',
        departureTime: '09:15',
        arrivalTime: '12:30',
        price: 185,
        currency: 'EUR',
        availableSeats: 18,
      },
      {
        id: 'f2',
        airline: 'Air France',
        flightNumber: 'AF1496',
        origin: originCity || 'Paris (ORY)',
        destination: destination || 'Marrakech (RAK)',
        departureTime: '13:40',
        arrivalTime: '16:55',
        price: 210,
        currency: 'EUR',
        availableSeats: 12,
      },
      {
        id: 'f3',
        airline: 'Transavia',
        flightNumber: 'TO3012',
        origin: originCity || 'Lyon (LYS)',
        destination: destination || 'Agadir (AGA)',
        departureTime: '15:20',
        arrivalTime: '18:45',
        price: 140,
        currency: 'EUR',
        availableSeats: 30,
      },
    ];
  },

  async searchActivities(category?: string, city?: string): Promise<ActivityOffer[]> {
    return [
      {
        id: 'a1',
        title: 'Excursion dans le Désert et Balade en Dromadaire',
        city: city || 'Marrakech',
        country: 'Maroc',
        category: category || 'Aventure',
        price: 45,
        currency: 'EUR',
        durationHours: 4,
        imageUrl: '/image/a1.jpg',
        description: 'Vivez une expérience inoubliable au coucher du soleil dans la palmeraie avec thé traditionnel.',
      },
      {
        id: 'a2',
        title: 'Session Kitesurf & Glisse Lagune',
        city: city || 'Dakhla',
        country: 'Maroc',
        category: category || 'Sports Nautiques',
        price: 80,
        currency: 'EUR',
        durationHours: 3,
        imageUrl: '/image/a2.jpg',
        description: 'Cours de kitesurf pour tous niveaux sur l’une des plus belles lagunes au monde.',
      },
      {
        id: 'a3',
        title: 'Visite Guidée des Palais & Médina',
        city: city || 'Fès',
        country: 'Maroc',
        category: category || 'Culture',
        price: 30,
        currency: 'EUR',
        durationHours: 3,
        imageUrl: '/image/chefchaoun.jpeg',
        description: 'Parcourez les venelles historiques et découvrez l’artisanat séculaire avec un guide agréé.',
      },
    ];
  },

  async searchTransfers(type: 'TAXI' | 'TRAIN' | 'CAR_RENTAL', city?: string): Promise<TransferOffer[]> {
    if (type === 'TAXI') {
      return [
        {
          id: 't1',
          type: 'TAXI',
          vehicleModel: 'Mercedes-Benz E-Class Private Taxi',
          departureCity: city || 'Aéroport Marrakech-Ménara',
          arrivalCity: 'Centre-ville / Médina',
          price: 25,
          currency: 'EUR',
          capacity: 4,
        },
        {
          id: 't2',
          type: 'TAXI',
          vehicleModel: 'Minivan VIP Transfert Famille',
          departureCity: city || 'Aéroport Casablanca Med V',
          arrivalCity: 'Hôtel Casablanca',
          price: 45,
          currency: 'EUR',
          capacity: 7,
        },
      ];
    } else if (type === 'TRAIN') {
      return [
        {
          id: 'tr1',
          type: 'TRAIN',
          vehicleModel: 'Al Boraq TGV Première Classe',
          departureCity: city || 'Tanger Ville',
          arrivalCity: 'Casablanca Voyageurs',
          price: 35,
          currency: 'EUR',
          capacity: 120,
        },
        {
          id: 'tr2',
          type: 'TRAIN',
          vehicleModel: 'Atlas Train Rapide Confort',
          departureCity: city || 'Casablanca Oasis',
          arrivalCity: 'Marrakech',
          price: 20,
          currency: 'EUR',
          capacity: 90,
        },
      ];
    } else {
      return [
        {
          id: 'cr1',
          type: 'CAR_RENTAL',
          vehicleModel: 'Renault Clio 5 (Climatisation, GPS)',
          departureCity: city || 'Agence Aéroport Marrakech',
          price: 30,
          currency: 'EUR',
          capacity: 5,
        },
        {
          id: 'cr2',
          type: 'CAR_RENTAL',
          vehicleModel: 'Dacia Duster 4x4 Évasion',
          departureCity: city || 'Agence Dakhla Centre',
          price: 55,
          currency: 'EUR',
          capacity: 5,
        },
      ];
    }
  },
};
