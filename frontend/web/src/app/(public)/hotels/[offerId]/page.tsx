'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getOfferDetail } from '@/lib/offer-store';
import type { HotelOffer, HotelRoomOffer } from '@/types/travel.types';
import { SafeEntityImage } from '@/components/travel/SafeEntityImage';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { libraryService } from '@/services/library.service';
import FavoriteButton from '@/components/common/FavoriteButton';
import {
  OfferDetailsShell,
  OfferDetailsHeader,
  OfferPricePanel,
  ConditionList,
  OfferExpiredState,
  DetailLoadingSkeleton,
  type ConditionItem,
} from '@/components/travel/details';

export default function HotelDetailsPage() {
  const params = useParams();
  const offerId = typeof params?.offerId === 'string' ? params.offerId : '';

  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelOffer | null>(null);
  const [selectedRoomOfferId, setSelectedRoomOfferId] = useState<string | null>(null);

  useEffect(() => {
    if (offerId) {
      const resolved = getOfferDetail<HotelOffer>('HOTEL', offerId);
      setHotel(resolved);
      if (resolved && resolved.roomOffers && resolved.roomOffers.length > 0) {
        setSelectedRoomOfferId(resolved.roomOffers[0].offerId);
      }
      if (resolved) {
        libraryService.recordRecentView({
          resourceType: 'HOTEL',
          resourceReference: resolved.offerId || resolved.hotelId || offerId,
          title: resolved.name || resolved.hotelName || 'Hôtel',
          destination: `${resolved.city || ''}, ${resolved.country || ''}`,
          thumbnailUrl: resolved.imageUrl,
          providerLabel: resolved.provider || 'NUITEE',
        }).catch(() => {});
      }
    }
    setLoading(false);
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
      <div style={{ padding: '2rem 1rem' }}>
        <OfferExpiredState
          productLabel="cet hébergement"
          searchHref="/hotels"
          searchLabel="Retourner à la recherche d'hôtels"
        />
      </div>
    );
  }

  const roomTitle = selectedRoom ? `${hotelDisplayName} - ${selectedRoom.roomName}` : hotelDisplayName;
  const selRef = selectedRoom?.selectionRef || selectedRoom?.offerId || hotel.selectionRef || hotel.offerId;
  const bookingUrl = `/booking?serviceType=HOTEL&serviceId=${encodeURIComponent(
    hotel.hotelId || hotel.offerId
  )}&selectionRef=${encodeURIComponent(selRef)}&offerId=${encodeURIComponent(
    selectedRoom?.offerId || hotel.offerId
  )}&serviceTitle=${encodeURIComponent(roomTitle)}&price=${activePrice}&currency=${activeCurrency}`;

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
          <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10, background: 'rgba(255, 255, 255, 0.9)', borderRadius: '50%', padding: '6px', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)' }}>
            <FavoriteButton
              resourceType="HOTEL"
              resourceReference={hotel.offerId || hotel.hotelId || offerId}
              title={hotelDisplayName}
              destination={`${hotel.city || ''}, ${hotel.country || ''}`}
              thumbnailUrl={hotel.imageUrl}
              providerLabel={hotel.provider || 'NUITEE'}
              priceSnapshot={activePrice}
              currencySnapshot={activeCurrency}
            />
          </div>
        </div>
      </div>

      {/* Available Room Options */}
      {hotel.roomOffers && hotel.roomOffers.length > 0 && (
        <div
          style={{
            background: 'var(--card, #ffffff)',
            borderRadius: '12px',
            padding: '1.5rem',
            border: '1px solid rgba(0, 0, 0, 0.06)',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          }}
        >
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text, #0f172a)' }}>
            Chambres et tarifs disponibles ({hotel.roomOffers.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {hotel.roomOffers.map((room) => {
              const isSelected = selectedRoomOfferId === room.offerId;
              return (
                <div
                  key={room.offerId}
                  onClick={() => setSelectedRoomOfferId(room.offerId)}
                  style={{
                    border: isSelected ? '2px solid #01796F' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1.25rem',
                    background: isSelected ? 'rgba(1, 121, 111, 0.03)' : '#f8fafc',
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
                      {room.refundable ? (
                        <span style={{ color: '#16a34a', fontWeight: 600 }}>
                          <i className="fas fa-check" style={{ marginRight: '0.3rem' }} />
                          Annulation gratuite
                        </span>
                      ) : (
                        <span style={{ color: '#d97706' }}>Non remboursable</span>
                      )}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#01796F' }}>
                      <PriceDisplay conversion={room.pricePerNightConversion || room.priceConversion} amount={room.pricePerNight || room.price} currency={room.currency} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {room.pricePerNight ? '/ nuit' : 'total'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
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
