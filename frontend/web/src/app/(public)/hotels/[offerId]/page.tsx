'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOfferDetail } from '@/lib/offer-store';
import type { HotelOffer, HotelRoomOffer, RoomOccupancy } from '@/types/travel.types';
import { travelService } from '@/services/travel.service';
import { SafeEntityImage } from '@/components/travel/SafeEntityImage';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { libraryService } from '@/services/library.service';
import FavoriteButton from '@/components/common/FavoriteButton';
import { EntityReviews } from '@/components/travel/EntityReviews';
import {
  OfferDetailsShell,
  OfferDetailsHeader,
  OfferPricePanel,
  ConditionList,
  DetailLoadingSkeleton,
  type ConditionItem,
} from '@/components/travel/details';

export default function HotelDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelOffer | null>(null);
  const [selectedRoomOfferId, setSelectedRoomOfferId] = useState<string | null>(null);
  const [isFavorited, setIsFavorited] = useState(false);
  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [countryCode, setCountryCode] = useState('MA');
  const [guestNationality, setGuestNationality] = useState('MA');
  const [occupancies, setOccupancies] = useState<RoomOccupancy[]>([{ adults: 2, childrenAges: [] }]);
  const [metadata, setMetadata] = useState<{ title: string; imageUrl?: string } | null>(null);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const [visibleRoomCount, setVisibleRoomCount] = useState(5);
  const initialLoadKey = useRef('');

  const loadAvailability = async (city: string, arrival: string, departure: string,
    rooms: RoomOccupancy[], country: string, nationality: string, preserveCurrent = false) => {
    if (!city.trim() || !arrival || !departure || arrival < new Date().toISOString().split('T')[0] || departure <= arrival) {
      setRefreshError('Indiquez une destination et des dates futures valides pour actualiser les offres.');
      return;
    }
    if (!preserveCurrent) setLoading(true);
    setRefreshError(null);
    if (!preserveCurrent) setHotel(null);
    try {
      const data = await travelService.searchHotels({
        destination: city.trim(), city: city.trim(), countryCode: country,
        checkIn: arrival, checkOut: departure, rooms: rooms.length,
        adults: rooms.reduce((sum, room) => sum + room.adults, 0),
        children: rooms.reduce((sum, room) => sum + (room.childrenAges?.length || 0), 0),
        occupancies: rooms, guestNationality: nationality, currency: 'EUR',
      });
      const current = data.results?.find(result => result.hotelId === offerId);
      if (!current || !current.roomOffers?.length) {
        setRefreshError(data.status === 'PROVIDER_UNAVAILABLE'
          ? (data.message && !data.message.includes('No live') && !data.message.includes('Phase')
              ? data.message
              : 'Le fournisseur hôtelier est temporairement indisponible.')
          : 'Cette offre n’est plus disponible. Essayez d’autres dates de séjour.');
        return;
      }
      setHotel(current);
      setMetadata({ title: current.name || current.hotelName || 'Hôtel', imageUrl: current.imageUrl });
      setSelectedRoomOfferId(current.roomOffers?.[0]?.offerId || null);
      setVisibleRoomCount(5);
      libraryService.recordRecentView({
        resourceType: 'HOTEL', resourceReference: offerId,
        title: current.name || current.hotelName || 'Hôtel',
        destination: [current.city, current.country].filter(Boolean).join(', '),
        thumbnailUrl: current.imageUrl || null,
        providerLabel: current.provider || 'NUITEE',
      }).catch(() => {});
      libraryService.getFavorites().then(favs =>
        setIsFavorited(favs.some(fav => fav.resourceType === 'HOTEL' && fav.resourceReference === offerId))
      ).catch(() => {});
    } catch {
      setRefreshError('Impossible d’actualiser les offres pour le moment. Veuillez réessayer.');
    } finally {
      if (!preserveCurrent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!offerId) return;
    const params = new URLSearchParams(window.location.search);
    const cached = getOfferDetail<HotelOffer>('HOTEL', offerId);
    if (cached) {
      setHotel(cached);
      setMetadata({ title: cached.name || cached.hotelName || 'Hôtel', imageUrl: cached.imageUrl });
      setSelectedRoomOfferId(cached.roomOffers?.[0]?.offerId || null);
      setLoading(false);
    }
    const city = params.get('destination') || cached?.city || '';
    const arrival = params.get('checkIn') || cached?.checkIn || '';
    const departure = params.get('checkOut') || cached?.checkOut || '';
    const country = params.get('countryCode') || cached?.country || 'MA';
    const nationality = params.get('guestNationality') || 'MA';
    let rooms: RoomOccupancy[] = [{ adults: 2, childrenAges: [] }];
    try {
      const parsed = JSON.parse(params.get('occupancies') || 'null');
      if (Array.isArray(parsed) && parsed.length > 0 && parsed.length <= 4 &&
          parsed.every(room => Number.isInteger(room.adults) && room.adults >= 1 && Array.isArray(room.childrenAges))) rooms = parsed;
    } catch { /* Keep the visible default occupancy. */ }
    setDestination(city);
    setCheckIn(arrival);
    setCheckOut(departure);
    setCountryCode(country);
    setGuestNationality(nationality);
    setOccupancies(rooms);
    if (city && arrival && departure) {
      const key = `${offerId}:${city}:${arrival}:${departure}:${JSON.stringify(rooms)}`;
      if (initialLoadKey.current !== key) {
        initialLoadKey.current = key;
        // Render the cached search result immediately, then refresh provider
        // availability in the background without replacing the visible page
        // with a full-screen skeleton.
        void loadAvailability(city, arrival, departure, rooms, country, nationality, Boolean(cached));
      }
    } else {
      setLoading(false);
      libraryService.getFavorites().then(favs => {
        const favorite = favs.find(fav => fav.resourceType === 'HOTEL' && fav.resourceReference === offerId);
        if (favorite) {
          setMetadata({ title: favorite.title, imageUrl: favorite.thumbnailUrl || undefined });
          if (!city && favorite.destination) setDestination(favorite.destination.split(',')[0].trim());
          setIsFavorited(true);
        }
      }).catch(() => {});
      libraryService.getRecentViews().then(views => {
        const viewed = views.find(view => view.resourceType === 'HOTEL' && view.resourceReference === offerId);
        if (viewed) {
          setMetadata(current => current || { title: viewed.title, imageUrl: viewed.thumbnailUrl || undefined });
          if (!city && viewed.destination) setDestination(viewed.destination.split(',')[0].trim());
        }
      }).catch(() => {});
    }
  }, [offerId]);

  const hotelDisplayName = hotel?.name || hotel?.hotelName || 'Hôtel';

  const selectedRoom = useMemo<HotelRoomOffer | undefined>(() => {
    if (!hotel || !hotel.roomOffers || hotel.roomOffers.length === 0) return undefined;
    return hotel.roomOffers.find((r) => r.offerId === selectedRoomOfferId) || hotel.roomOffers[0];
  }, [hotel, selectedRoomOfferId]);

  const activePrice = selectedRoom?.pricePerNight || hotel?.pricePerNight || 0;
  const activeCurrency = selectedRoom?.currency || hotel?.currency || 'EUR';
  const activeConversion = selectedRoom?.pricePerNightConversion || hotel?.priceConversion;

  const conditions = useMemo<ConditionItem[]>(() => {
    if (!hotel) return [];
    const items: ConditionItem[] = [];

    // Cancellation policy from selected room
    if (selectedRoom) {
      if (selectedRoom.refundable === true) {
        items.push({
          icon: 'fas fa-check-circle',
          title: 'Annulation gratuite',
          description: selectedRoom.cancellationDeadline
            ? `Annulation gratuite possible jusqu'au ${selectedRoom.cancellationDeadline}`
            : (selectedRoom.cancellationSummary || 'Annulation remboursable selon les conditions du fournisseur.'),
          status: 'success',
        });
      } else if (selectedRoom.refundable === false) {
        items.push({
          icon: 'fas fa-ban',
          title: 'Conditions d\'annulation',
          description: 'Tarif non remboursable en cas d\'annulation ou de non-présentation.',
          status: 'warning',
        });
      }

      // Board plan
      if (selectedRoom.boardName || selectedRoom.boardType) {
        items.push({
          icon: 'fas fa-utensils',
          title: 'Restauration / Repas',
          description: selectedRoom.boardName || selectedRoom.boardType,
          status: 'neutral',
        });
      }

      // Bed configuration
      if (selectedRoom.bedType) {
        items.push({
          icon: 'fas fa-bed',
          title: 'Type de literie',
          description: selectedRoom.bedType,
          status: 'neutral',
        });
      }

      // Occupancy
      if (selectedRoom.maxOccupancy != null) {
        items.push({
          icon: 'fas fa-users',
          title: 'Capacité de la chambre',
          description: `Jusqu'à ${selectedRoom.maxOccupancy} personne(s) (${selectedRoom.adultCount ?? 2} adulte(s)${selectedRoom.childCount ? `, ${selectedRoom.childCount} enfant(s)` : ''})`,
          status: 'neutral',
        });
      }
    }

    // Property type
    if (hotel.accommodationType || hotel.propertyType) {
      items.push({
        icon: 'fas fa-building',
        title: 'Type d\'établissement',
        description: hotel.accommodationType || hotel.propertyType,
        status: 'neutral',
      });
    }

    // Provider provenance
    if (hotel.provider) {
      items.push({
        icon: 'fas fa-shield-alt',
        title: 'Fournisseur partenaire',
        description: `Disponibilités et tarifs gérés via ${hotel.provider} Connect`,
        status: 'neutral',
      });
    }

    return items;
  }, [hotel, selectedRoom]);

  if (loading) {
    return <DetailLoadingSkeleton />;
  }

  if (!hotel) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 text-slate-800 dark:text-slate-100">
        <Link href="/hotels" className="text-sm text-[#01796F] dark:text-[#02E0D5]">← Retour aux hébergements</Link>
        {metadata?.imageUrl && <div className="mt-6 h-52 overflow-hidden rounded-xl"><SafeEntityImage src={metadata.imageUrl} alt={metadata.title} entityType="HOTEL" className="h-full w-full object-cover" /></div>}
        <h1 className="mt-6 text-2xl font-bold">{metadata?.title || 'Hébergement'}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Cette offre n’est plus disponible. Actualisez les offres pour connaître les tarifs et disponibilités actuels.</p>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Destination
            <input value={destination} onChange={event => setDestination(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-[#062523] dark:text-white" />
          </label>
          <label className="text-sm font-medium">Arrivée
            <input type="date" value={checkIn} onChange={event => setCheckIn(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-[#062523] dark:text-white" />
          </label>
          <label className="text-sm font-medium">Départ
            <input type="date" value={checkOut} onChange={event => setCheckOut(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-[#062523] dark:text-white" />
          </label>
          <label className="text-sm font-medium">Adultes
            <input type="number" min={1} max={4} value={occupancies[0]?.adults || 2} onChange={event => setOccupancies([{ adults: Number(event.target.value) || 1, childrenAges: [] }])} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-600 dark:bg-[#062523] dark:text-white" />
          </label>
        </div>
        {refreshError && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{refreshError}</p>}
        <button type="button" onClick={() => void loadAvailability(destination, checkIn, checkOut, occupancies, countryCode, guestNationality)} className="mt-5 rounded-lg bg-[#01796F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005f57]">Actualiser les offres</button>
        <div className="mt-8"><EntityReviews type="ACCOMMODATION" provider="NUITEE" reference={offerId} /></div>
      </main>
    );
  }

  const roomTitle = selectedRoom ? `${hotelDisplayName} - ${selectedRoom.roomName}` : hotelDisplayName;
  const selRef = selectedRoom?.selectionRef || selectedRoom?.offerId || hotel.selectionRef || hotel.offerId;
  const bookingUrl = `/booking?serviceType=HOTEL&serviceId=${encodeURIComponent(
    hotel.hotelId || hotel.offerId
  )}&selectionRef=${encodeURIComponent(selRef)}&offerId=${encodeURIComponent(
    selectedRoom?.offerId || hotel.offerId
  )}&serviceTitle=${encodeURIComponent(roomTitle)}&price=${selectedRoom?.price || activePrice}&currency=${activeCurrency}&startDate=${hotel.checkIn || checkIn}&endDate=${hotel.checkOut || checkOut}&travelers=${occupancies.reduce((sum, room) => sum + room.adults + (room.childrenAges?.length || 0), 0)}`;

  const badges: string[] = [];
  if (hotel.starRating || hotel.rating) {
    badges.push(`${hotel.starRating || hotel.rating} étoiles`);
  }
  if (hotel.accommodationType) {
    badges.push(hotel.accommodationType);
  }

  return (
    <OfferDetailsShell
      backHref="/hotels"
      backLabel="Retour aux résultats d'hôtels"
      sidebar={
        <OfferPricePanel
          amount={activePrice}
          currency={activeCurrency}
          conversion={activeConversion}
          unitLabel="par nuit"
          bookingHref={bookingUrl}
          bookingLabel={selectedRoom ? 'Réserver cette chambre' : 'Sélectionner cet hôtel'}
        />
      }
      mobileAction={
        <div className="travel-details-mobile-action__inner flex items-center justify-between gap-3">
          <div>
            <div className="travel-details-mobile-action__label text-xs">À partir de / nuit</div>
            <div className="travel-details-mobile-action__price text-xl font-extrabold">
              {activePrice} {activeCurrency}
            </div>
          </div>
          <a href={bookingUrl} className="travel-details-mobile-action__link rounded-lg px-5 py-2.5 text-sm font-bold">
            Réserver
          </a>
        </div>
      }
    >
      {/* Header */}
      <OfferDetailsHeader
        title={hotelDisplayName}
        subtitle={`${hotel.address ? `${hotel.address}, ` : ''}${hotel.city || ''}, ${hotel.country || ''}`}
        icon="fas fa-hotel"
        provider={hotel.provider || 'NUITEE'}
        badges={badges}
        action={
          <FavoriteButton
            resourceType="HOTEL"
            resourceReference={hotel.hotelId || hotel.id || (offerId.length <= 128 ? offerId : offerId.substring(0, 128))}
            title={hotelDisplayName}
            destination={[hotel.city, hotel.country].filter(Boolean).join(', ')}
            thumbnailUrl={hotel.imageUrl}
            priceSnapshot={activePrice}
            currencySnapshot={activeCurrency}
            isInitiallyFavorited={isFavorited}
            onToggle={(fav) => setIsFavorited(fav)}
          />
        }
      />

      {/* Hotel Image (Authoritative Provider Image or SafeEntityImage fallback) */}
      <div className="travel-details-media">
        <div className="travel-details-media__frame relative h-[320px] w-full">
          <SafeEntityImage
            src={hotel.imageUrl}
            alt={hotelDisplayName}
            entityType="HOTEL"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      <div className="text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-800 dark:text-white">Séjour :</span> {hotel.checkIn || checkIn} → {hotel.checkOut || checkOut}
        {' · '}{occupancies.reduce((sum, room) => sum + room.adults + (room.childrenAges?.length || 0), 0)} voyageur(s)
        {' · '}{occupancies.length} chambre(s)
      </div>

      {hotel.description && (
        <div className="travel-details-description text-sm leading-7">
          <h2 className="mb-2 text-lg font-bold">À propos de l’établissement</h2>
          <p>{hotel.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p>
        </div>
      )}

      {/* Available Room Options */}
      {hotel.roomOffers && hotel.roomOffers.length > 0 && (
        <div className="travel-hotel-rooms">
          <h3 className="travel-hotel-rooms__title text-lg font-bold mb-4">
            Chambres et tarifs disponibles ({hotel.roomOffers.length})
          </h3>

          <div className="flex flex-col gap-4">
            {hotel.roomOffers.slice(0, visibleRoomCount).map((room) => {
              const isSelected = selectedRoomOfferId === room.offerId;
              return (
                <div
                  key={room.offerId}
                  onClick={() => setSelectedRoomOfferId(room.offerId)}
                  className={`travel-hotel-room ${isSelected ? 'travel-hotel-room--selected' : ''} flex items-center justify-between gap-4 flex-wrap px-2 py-3.5 cursor-pointer transition-colors`}
                >
                  <div className="travel-hotel-room__content flex-1 min-w-[220px]">
                    <div className="travel-hotel-room__heading flex items-center gap-2 mb-1">
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedRoomOfferId(room.offerId)}
                        className="cursor-pointer"
                      />
                      <span className="travel-hotel-room__name font-bold text-base">
                        {room.roomName}
                      </span>
                    </div>

                    <div className="travel-hotel-room__meta ml-6 flex flex-col gap-1 text-sm">
                      {room.boardName && <span>{room.boardName}</span>}
                      {room.bedType && <span>Lit: {room.bedType}</span>}
                      {room.refundable === true ? (
                        <span className="travel-hotel-room__refundable font-semibold">
                          <i className="fas fa-check mr-1" />
                          Annulation gratuite
                        </span>
                      ) : room.refundable === false ? (
                        <span className="travel-hotel-room__nonrefundable">Non remboursable</span>
                      ) : (
                        <span>Conditions d’annulation selon le fournisseur</span>
                      )}
                    </div>
                  </div>

                  <div className="travel-hotel-room__price-wrap text-right">
                    <div className="travel-hotel-room__price text-xl font-extrabold">
                      <PriceDisplay conversion={room.priceConversion} amount={room.price} currency={room.currency} />
                    </div>
                    <div className="travel-hotel-room__night text-xs">
                      séjour complet{room.pricePerNight ? ` · ${room.pricePerNight} ${room.currency}/nuit fournisseur` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hotel.roomOffers.length > visibleRoomCount && (
            <button type="button" onClick={() => setVisibleRoomCount(count => Math.min(count + 5, hotel.roomOffers?.length ?? count + 5))}
              className="mt-5 inline-flex items-center gap-3 rounded-lg border border-[#b8d5cf] bg-white px-4 py-2.5 text-sm font-semibold text-[#01796F] transition-colors hover:bg-[#edf7f4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01796F] dark:border-[#35625b] dark:bg-[#062523] dark:text-[#8ce0d2] dark:hover:bg-[#0d3934]">
              <i className="fas fa-chevron-down text-xs" aria-hidden="true" />
              Afficher {Math.min(5, hotel.roomOffers.length - visibleRoomCount)} autres offres
              <span className="border-l border-[#c9ded8] pl-3 text-xs font-medium text-[#668079] dark:border-[#35625b] dark:text-[#a6c9c1]">{hotel.roomOffers.length - visibleRoomCount} restantes</span>
            </button>
          )}
        </div>
      )}

      {/* Conditions & Information */}
      <ConditionList
        title="Conditions de séjour & Politiques de l'établissement"
        items={conditions}
      />
      <EntityReviews type="ACCOMMODATION" provider={hotel.provider || 'NUITEE'} reference={hotel.hotelId || offerId} />
    </OfferDetailsShell>
  );
}
