import { AdminBooking } from '@/types/admin.types';

export interface ParsedTravelContext {
  productType: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  dates: string;
  route?: string;
  imageUrl?: string;
  details: { label: string; value: string }[];
}

export function parseTravelContext(booking: AdminBooking): ParsedTravelContext {
  const type = (booking.productType || 'UNKNOWN').toUpperCase();
  const d = booking.selectedDetails || {};

  switch (type) {
    case 'HOTEL': {
      const name = d.hotelName || d.name || `Hôtel (${booking.bookingReference})`;
      const city = d.city || d.destination || 'Maroc';
      const checkIn = d.checkIn || '';
      const checkOut = d.checkOut || '';
      const dates = checkIn && checkOut ? `${checkIn} → ${checkOut}` : checkIn || 'Dates flexibles';
      const image = Array.isArray(d.galleryUrls) && d.galleryUrls.length > 0 
        ? d.galleryUrls[0] 
        : d.imageUrl || d.heroImageUrl || undefined;
      const room = d.roomSummary || d.selectedRoom?.roomName || 'Chambre standard';

      return {
        productType: 'HOTEL',
        title: name,
        subtitle: `${city}${d.country ? `, ${d.country}` : ''} • ${room}`,
        badge: 'Hôtel',
        badgeColor: '#10B981', // emerald
        dates,
        imageUrl: image,
        details: [
          { label: 'Établissement', value: name },
          { label: 'Localisation', value: `${city}${d.country ? ` (${d.country})` : ''}` },
          { label: 'Arrivée', value: checkIn || '—' },
          { label: 'Départ', value: checkOut || '—' },
          { label: 'Hébergement', value: room },
          { label: 'Formule / Pension', value: d.selectedRoom?.boardType || 'Standard' },
          { label: 'Étoiles', value: d.starRating ? `${d.starRating} ★` : '—' },
          { label: 'Note Avis', value: d.reviewScore ? `${d.reviewScore}/10 (${d.reviewCount || 0} avis)` : '—' },
        ],
      };
    }

    case 'FLIGHT': {
      const origin = d.origin || d.departureAirport || 'CMN';
      const destination = d.destination || d.arrivalAirport || 'CDG';
      const airline = d.airlineCode || d.airline || 'Compagnie';
      const flightNum = d.flightNumber ? `${airline} ${d.flightNumber}` : airline;
      const depTime = d.departureTime || d.departureDate || '';
      const arrTime = d.arrivalTime || '';
      const dates = depTime ? (arrTime ? `${depTime} → ${arrTime}` : depTime) : 'Date à confirmer';

      return {
        productType: 'FLIGHT',
        title: `${origin} ✈ ${destination}`,
        subtitle: `${flightNum} • ${d.cabinClass || 'Économique'} • ${d.stops === 0 ? 'Direct' : d.stops ? `${d.stops} escale(s)` : 'Vol régulier'}`,
        badge: 'Vol',
        badgeColor: '#0EA5E9', // sky blue
        dates,
        route: `${origin} → ${destination}`,
        details: [
          { label: 'Trajet', value: `${origin} ✈ ${destination}` },
          { label: 'Vol & Compagnie', value: flightNum },
          { label: 'Départ', value: depTime || '—' },
          { label: 'Arrivée', value: arrTime || '—' },
          { label: 'Classe', value: d.cabinClass || 'Économique' },
          { label: 'Passagers', value: d.passengers ? `${d.passengers} voyageur(s)` : '1 passager' },
        ],
      };
    }

    case 'ACTIVITY': {
      const title = d.title || d.activityName || 'Activité & Excursion';
      const dest = d.destination || d.city || 'Maroc';
      const date = d.date || d.activityDate || 'Date libre';
      const image = Array.isArray(d.galleryUrls) && d.galleryUrls.length > 0
        ? d.galleryUrls[0]
        : d.imageUrl || d.heroImageUrl || undefined;

      return {
        productType: 'ACTIVITY',
        title,
        subtitle: `${dest} • ${d.category || 'Visite culturelle'}`,
        badge: 'Activité',
        badgeColor: '#F59E0B', // amber
        dates: date,
        imageUrl: image,
        details: [
          { label: 'Activité', value: title },
          { label: 'Destination', value: dest },
          { label: 'Date', value: date },
          { label: 'Durée', value: d.durationHours ? `${d.durationHours}h` : '—' },
          { label: 'Participants', value: d.travelers ? `${d.travelers} participant(s)` : '1 participant' },
          { label: 'Catégorie', value: d.category || 'Expérience locale' },
        ],
      };
    }

    case 'TRANSFER': {
      const pickup = d.pickup || 'Point de prise en charge';
      const dropoff = d.dropoff || 'Destination de dépose';
      const vehicle = d.vehicleModel || d.vehicleType || 'Berline VTC';
      const time = d.time ? `${d.date || ''} à ${d.time}` : d.date || 'Sur réservation';

      return {
        productType: 'TRANSFER',
        title: `${pickup} ➔ ${dropoff}`,
        subtitle: `${vehicle} • ${d.transferType || 'Transfert privé'}`,
        badge: 'Transfert',
        badgeColor: '#8B5CF6', // purple
        dates: time,
        route: `${pickup} → ${dropoff}`,
        details: [
          { label: 'Prise en charge', value: pickup },
          { label: 'Dépose', value: dropoff },
          { label: 'Date & Heure', value: time },
          { label: 'Véhicule', value: vehicle },
          { label: 'Passagers', value: d.passengers ? `${d.passengers} pers.` : '1 pers.' },
        ],
      };
    }

    case 'TRAIN': {
      const orig = d.originStation || d.origin || 'Gare départ';
      const dest = d.destinationStation || d.destination || 'Gare arrivée';
      const train = d.trainNumber ? `Train Al Boraq #${d.trainNumber}` : 'ONCF Al Boraq';
      const time = d.departureDate ? `${d.departureDate} (${d.departureTime || ''})` : 'Date planifiée';

      return {
        productType: 'TRAIN',
        title: `${orig} 🚆 ${dest}`,
        subtitle: `${train} • ${d.operator || 'ONCF'}`,
        badge: 'Train',
        badgeColor: '#EC4899', // pink
        dates: time,
        route: `${orig} → ${dest}`,
        details: [
          { label: 'Gare départ', value: orig },
          { label: 'Gare arrivée', value: dest },
          { label: 'Train', value: train },
          { label: 'Horaires', value: time },
          { label: 'Classe', value: d.seatClass || '1ère / 2ème classe' },
        ],
      };
    }

    default: {
      return {
        productType: type,
        title: `Prestation ${type}`,
        subtitle: `Réf: ${booking.bookingReference}`,
        badge: type,
        badgeColor: '#6B7280',
        dates: booking.createdAt ? new Date(booking.createdAt).toLocaleDateString('fr-FR') : '—',
        details: [
          { label: 'Référence', value: booking.bookingReference },
          { label: 'Type', value: type },
          { label: 'Fournisseur', value: booking.provider || 'Plateforme' },
        ],
      };
    }
  }
}
