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
  const [visibleRoomCount, setVisibleRoomCount] = useState(8);
  const initialLoadKey = useRef('');

  const loadAvailability = async (city: string, arrival: string, departure: string,
    rooms: RoomOccupancy[], country: string, nationality: string) => {
    if (!city.trim() || !arrival || !departure || arrival < new Date().toISOString().split('T')[0] || departure <= arrival) {
      setRefreshError('Indiquez une destination et des dates futures valides pour actualiser les offres.');
      return;
    }
    setLoading(true);
    setRefreshError(null);
    setHotel(null);
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
      setVisibleRoomCount(8);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!offerId) return;
    const params = new URLSearchParams(window.location.search);
    const cached = getOfferDetail<HotelOffer>('HOTEL', offerId);
    if (cached) setMetadata({ title: cached.name || cached.hotelName || 'Hôtel', imageUrl: cached.imageUrl });
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
        void loadAvailability(city, arrival, departure, rooms, country, nationality);
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
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>À partir de / nuit</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#01796F' }}>
              {activePrice} {activeCurrency}
            </div>
          </div>
          <a
            href={bookingUrl}
            style={{
              padding: '0.65rem 1.25rem',
              borderRadius: '6px',
              background: '#01796F',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.9rem',
              textDecoration: 'none',
            }}
          >
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
      <div
        style={{
          background: 'var(--card, #ffffff)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ height: '320px', position: 'relative', width: '100%', background: '#e2e8f0' }}>
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
        <section className="border-t border-slate-200 pt-5 text-sm leading-7 text-slate-700 dark:border-[#01796F]/30 dark:text-slate-200">
          <h2 className="mb-2 text-lg font-bold text-slate-900 dark:text-white">À propos de l’établissement</h2>
          <p>{hotel.description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()}</p>
        </section>
      )}

      {hotel.galleryUrls && hotel.galleryUrls.filter(url => url && url !== hotel.imageUrl).length > 0 && (
        <div className="flex gap-2 overflow-x-auto" aria-label="Photos de l’établissement">
          {hotel.galleryUrls.filter(url => url && url !== hotel.imageUrl).map(url => (
            <SafeEntityImage key={url} src={url} alt={hotelDisplayName} entityType="HOTEL" className="h-28 w-40 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}

      {/* Available Room Options */}
      {hotel.roomOffers && hotel.roomOffers.length > 0 && (
        <div
          style={{
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border, #d9e7e3)',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text, #0f172a)' }}>
            Chambres et tarifs disponibles ({hotel.roomOffers.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {hotel.roomOffers.slice(0, visibleRoomCount).map((room) => {
              const isSelected = selectedRoomOfferId === room.offerId;
              return (
                <div
                  key={room.offerId}
                  onClick={() => setSelectedRoomOfferId(room.offerId)}
                  style={{
                    borderBottom: '1px solid var(--border, #d9e7e3)',
                    padding: '0.9rem 0.5rem',
                    background: isSelected ? 'rgba(1, 121, 111, 0.04)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    transition: 'border-color 0.2s ease, background 0.2s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <input
                        type="radio"
                        checked={isSelected}
                        onChange={() => setSelectedRoomOfferId(room.offerId)}
                        style={{ accentColor: '#01796F', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                        {room.roomName}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      {room.boardName && <span>{room.boardName}</span>}
                      {room.bedType && <span>Lit: {room.bedType}</span>}
                      {room.refundable === true ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          <i className="fas fa-check" style={{ marginRight: '0.3rem' }} />
                          Annulation gratuite
                        </span>
                      ) : room.refundable === false ? (
                        <span style={{ color: '#d97706' }}>Non remboursable</span>
                      ) : (
                        <span>Conditions d’annulation selon le fournisseur</span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#01796F' }}>
                      <PriceDisplay conversion={room.priceConversion} amount={room.price} currency={room.currency} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      séjour complet{room.pricePerNight ? ` · ${room.pricePerNight} ${room.currency}/nuit fournisseur` : ''}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {hotel.roomOffers.length > visibleRoomCount && (
            <button type="button" onClick={() => setVisibleRoomCount(count => count + 12)} className="mt-4 text-sm font-semibold text-[#01796F] hover:underline dark:text-[#02E0D5]">
              Afficher d’autres offres ({hotel.roomOffers.length - visibleRoomCount} restantes)
            </button>
          )}
        </div>
      )}

      {/* Conditions & Information */}
      <ConditionList
        title="Conditions de séjour & Politiques de l'établissement"
        items={conditions}
      />
    </OfferDetailsShell>
  );
}
