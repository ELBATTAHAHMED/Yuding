'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ApiError } from '@/lib/api-client';
import type { HotelOffer, HotelRoomOffer, RoomOccupancy } from '@/types/travel.types';
import {
  filterHotels,
  type HotelCategoryFilter,
} from '@/lib/hotel-filters';
import { sortHotels, buildActiveFilterChips } from '@/lib/search-ux';
import type { HotelSortKey } from '@/lib/search-ux';
import { DestinationWeather, GeoPlaceSelector, GeoMap, NearbyPoiPanel, DestinationImageGallery, HotelSkeleton } from '@/components/travel';
import { PriceDisplay } from '@/components/travel/PriceDisplay';
import { EmptyState, ErrorState, SortBar } from '@/components/ui';
import { saveSearchOffers } from '@/lib/offer-store';
import type { GeoPlace, NearbyPlace } from '@/types/geo.types';
import { geoService } from '@/services/geo.service';

interface PresetDestination {
  label: string;
  city: string;
  country: string;
  countryCode: string;
}

const PRESET_DESTINATIONS: PresetDestination[] = [
  { label: 'Marrakech (Maroc)', city: 'Marrakech', country: 'Maroc', countryCode: 'MA' },
  { label: 'Casablanca (Maroc)', city: 'Casablanca', country: 'Maroc', countryCode: 'MA' },
  { label: 'Agadir (Maroc)', city: 'Agadir', country: 'Maroc', countryCode: 'MA' },
  { label: 'Tanger (Maroc)', city: 'Tangier', country: 'Maroc', countryCode: 'MA' },
  { label: 'Rabat (Maroc)', city: 'Rabat', country: 'Maroc', countryCode: 'MA' },
  { label: 'Fès (Maroc)', city: 'Fes', country: 'Maroc', countryCode: 'MA' },
  { label: 'Chefchaouen (Maroc)', city: 'Chefchaouen', country: 'Maroc', countryCode: 'MA' },
  { label: 'Paris (France)', city: 'Paris', country: 'France', countryCode: 'FR' },
  { label: 'Madrid (Espagne)', city: 'Madrid', country: 'Espagne', countryCode: 'ES' },
  { label: 'Dubaï (Émirats arabes unis)', city: 'Dubai', country: 'Émirats arabes unis', countryCode: 'AE' },
  { label: 'Londres (Royaume-Uni)', city: 'London', country: 'Royaume-Uni', countryCode: 'GB' },
  { label: 'Rome (Italie)', city: 'Rome', country: 'Italie', countryCode: 'IT' },
];

function addDays(dateStr: string, days: number): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function HotelsPage() {
  // Search parameters
  const [destinationInput, setDestinationInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('MA');
  const [selectedGeoPlace, setSelectedGeoPlace] = useState<GeoPlace | null>(null);
  const [destinationPois, setDestinationPois] = useState<NearbyPlace[]>([]);
  const [isLoadingPois, setIsLoadingPois] = useState(false);
  const [selectedPoi, setSelectedPoi] = useState<NearbyPlace | null>(null);
  const [showDestinationGuide, setShowDestinationGuide] = useState(false);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guestNationality, setGuestNationality] = useState('MA');
  const [currency] = useState('EUR');

  // Rooms & Occupancies
  const [occupancies, setOccupancies] = useState<RoomOccupancy[]>([
    { adults: 2, childrenAges: [] },
  ]);
  const [showOccupancyModal, setShowOccupancyModal] = useState(false);

  // Results & UI State
  const [allHotels, setAllHotels] = useState<HotelOffer[]>([]);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<HotelCategoryFilter>('ALL');
  const [sortKey, setSortKey] = useState<HotelSortKey>('PRICE_ASC');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const minCheckOut = checkIn ? addDays(checkIn, 1) : addDays(today, 1);

  const totalAdults = occupancies.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = occupancies.reduce((sum, r) => sum + (r.childrenAges?.length || 0), 0);

  const handleGeoPlaceSelect = async (place: GeoPlace | null) => {
    setSelectedGeoPlace(place);
    setSelectedPoi(null);
    if (place) {
      const cityName = place.city || place.name;
      setSelectedCity(cityName);
      setSelectedCountryCode(place.countryCode || 'MA');
      setDestinationInput(cityName);
      setValidationError(null);

      // Fetch nearby POIs if coordinates available
      if (place.latitude && place.longitude) {
        setIsLoadingPois(true);
        setShowDestinationGuide(true);
        try {
          const pois = await geoService.getNearbyPlaces({
            lat: place.latitude,
            lon: place.longitude,
            radius: 5000,
            limit: 20,
          });
          setDestinationPois(pois);
        } catch {
          setDestinationPois([]);
        } finally {
          setIsLoadingPois(false);
        }
      }
    } else {
      setSelectedCity('');
      setDestinationInput('');
      setDestinationPois([]);
      setShowDestinationGuide(false);
    }
  };

  const handleDestinationSelect = (preset: PresetDestination) => {
    setDestinationInput(preset.city);
    setSelectedCity(preset.city);
    setSelectedCountryCode(preset.countryCode);
    setValidationError(null);

    // Forward geocode preset to obtain coordinates and POIs for map
    geoService.geocode({ text: `${preset.city}, ${preset.country}` }).then((res) => {
      if (res && res.length > 0) {
        handleGeoPlaceSelect(res[0]);
      }
    }).catch(() => {});
  };

  const handleCheckInChange = (val: string) => {
    setCheckIn(val);
    setValidationError(null);
    // Automatically advance checkOut if it is empty or not after checkIn
    if (!checkOut || checkOut <= val) {
      setCheckOut(addDays(val, 1));
    }
  };

  const handleCheckOutChange = (val: string) => {
    setCheckOut(val);
    if (checkIn && val <= checkIn) {
      setValidationError("La date de départ doit être au moins 1 jour après la date d'arrivée (séjour minimum d'une nuit).");
    } else {
      setValidationError(null);
    }
  };

  const handleAddRoom = () => {
    if (occupancies.length < 4) {
      setOccupancies([...occupancies, { adults: 2, childrenAges: [] }]);
    }
  };

  const handleRemoveRoom = (index: number) => {
    if (occupancies.length > 1) {
      setOccupancies(occupancies.filter((_, i) => i !== index));
    }
  };

  const handleAdultsChange = (roomIndex: number, delta: number) => {
    setOccupancies(
      occupancies.map((room, i) => {
        if (i !== roomIndex) return room;
        const newAdults = Math.max(1, Math.min(4, room.adults + delta));
        return { ...room, adults: newAdults };
      })
    );
  };

  const handleChildrenCountChange = (roomIndex: number, delta: number) => {
    setOccupancies(
      occupancies.map((room, i) => {
        if (i !== roomIndex) return room;
        const currentCount = room.childrenAges?.length || 0;
        const newCount = Math.max(0, Math.min(3, currentCount + delta));
        let newAges = [...(room.childrenAges || [])];
        if (newCount > currentCount) {
          for (let k = currentCount; k < newCount; k++) {
            newAges.push(7);
          }
        } else if (newCount < currentCount) {
          newAges = newAges.slice(0, newCount);
        }
        return { ...room, childrenAges: newAges };
      })
    );
  };

  const handleChildAgeChange = (roomIndex: number, childIndex: number, age: number) => {
    setOccupancies(
      occupancies.map((room, i) => {
        if (i !== roomIndex) return room;
        const newAges = [...(room.childrenAges || [])];
        newAges[childIndex] = age;
        return { ...room, childrenAges: newAges };
      })
    );
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!destinationInput.trim()) {
      setValidationError('Veuillez renseigner une destination (ex: Marrakech, Casablanca, Paris).');
      return;
    }
    if (!checkIn) {
      setValidationError("Veuillez sélectionner une date d'arrivée.");
      return;
    }
    if (checkIn < today) {
      setValidationError("La date d'arrivée ne peut pas être dans le passé.");
      return;
    }
    if (!checkOut) {
      setValidationError("Veuillez sélectionner une date de départ.");
      return;
    }
    if (checkOut <= checkIn) {
      setValidationError("La date de départ doit être au moins 1 jour après la date d'arrivée (séjour minimum d'une nuit).");
      return;
    }

    setIsSearching(true);
    setHasSearched(true);
    setExpandedHotelId(null);
    setFilterType('ALL');

    try {
      const data = await travelService.searchHotels({
        destination: destinationInput.trim(),
        city: selectedCity || destinationInput.trim(),
        countryCode: selectedCountryCode || 'MA',
        checkIn,
        checkOut,
        rooms: occupancies.length,
        adults: totalAdults,
        children: totalChildren,
        occupancies,
        guestNationality,
        currency,
      });

      setAllHotels(data.results || []);
      saveSearchOffers('HOTEL', data.results || []);
      setSearchStatus(data.status);
      setSearchMessage(data.message);
    } catch (err: unknown) {
      setAllHotels([]);
      setSearchStatus('ERROR');
      if (err instanceof ApiError) {
        const code = err.errorCode || (err.data && err.data.errorCode);
        if (code === 'PROVIDER_AUTHENTICATION_FAILED' || err.status === 401) {
          setSearchMessage("Échec de l'authentification auprès du fournisseur hôtelier. Veuillez vérifier votre clé Nuitee Connect Sandbox.");
        } else if (code === 'PROVIDER_RATE_LIMITED' || err.status === 429) {
          setSearchMessage("Limite de requêtes atteinte auprès du fournisseur hôtelier. Veuillez patienter un instant.");
        } else if (code === 'PROVIDER_TIMEOUT' || err.status === 504) {
          setSearchMessage("Le fournisseur hôtelier a mis trop de temps à répondre. Veuillez réessayer.");
        } else if (code === 'PROVIDER_REQUEST_INVALID' || err.status === 400) {
          setSearchMessage("Paramètres de recherche d'hôtels non valides. Vérifiez la destination et les dates sélectionnées.");
        } else {
          setSearchMessage("Le fournisseur hôtelier est temporairement indisponible.");
        }
      } else {
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('401') || msg.includes('AUTHENTICATION')) {
          setSearchMessage("Échec de l'authentification auprès du fournisseur hôtelier. Veuillez vérifier votre clé Nuitee Connect Sandbox.");
        } else if (msg.includes('400') || msg.includes('INVALID')) {
          setSearchMessage("Paramètres de recherche d'hôtels non valides. Vérifiez la destination et les dates sélectionnées.");
        } else {
          setSearchMessage("Le fournisseur hôtelier est temporairement indisponible.");
        }
      }
    } finally {
      setIsSearching(false);
    }
  };

  const filteredHotels = useMemo(() => filterHotels(allHotels, filterType), [allHotels, filterType]);
  const sortedHotels = useMemo(() => sortHotels(filteredHotels, sortKey), [filteredHotels, sortKey]);

  const hotelActiveChips = useMemo(() => buildActiveFilterChips([
    { key: 'HOTEL_RIAD', label: 'Hôtels & Riads', active: filterType === 'HOTEL_RIAD' },
    { key: 'VILLA_HOUSE', label: 'Villas & Maisons', active: filterType === 'VILLA_HOUSE' },
    { key: 'APARTMENT', label: 'Appartements', active: filterType === 'APARTMENT' },
  ]), [filterType]);

  const toggleExpandHotel = (hotelId: string) => {
    setExpandedHotelId((prev) => (prev === hotelId ? null : hotelId));
  };

  const isInvalidDateRange = Boolean(checkIn && checkOut && checkOut <= checkIn);

  return (
    <div>
      {/* ==================== HERO SECTION ==================== */}
      <section
        style={{
          position: 'relative',
          background: 'linear-gradient(135deg, #001b1a 0%, #00796b 100%)',
          padding: '5rem 1rem 4rem',
          color: '#fff',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <h1
            style={{
              fontSize: '2.8rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              marginBottom: '0.75rem',
            }}
          >
            Hébergements &amp; Riads
          </h1>
          <p style={{ fontSize: '1.15rem', color: '#b2dfdb', marginBottom: '2.5rem' }}>
            Trouvez les meilleurs tarifs en direct avec Nuitee Connect parmi nos hôtels et riads partenaires
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              background: 'var(--card, #fff)',
              padding: '2rem',
              borderRadius: '12px',
              color: 'var(--text, #001b1a)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1.25rem',
              alignItems: 'flex-start',
              boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
            }}
          >
            {/* Destination Field with GeoPlaceSelector */}
            <div style={{ textAlign: 'left', position: 'relative' }}>
              <GeoPlaceSelector
                id="hotel-destination"
                label="Destination / Ville"
                placeholder="Rechercher une ville dans le monde (ex: Marrakech, Paris, Rome, Tokyo)..."
                type="city"
                selectedPlace={selectedGeoPlace}
                onSelect={handleGeoPlaceSelect}
                error={validationError && !destinationInput.trim() ? validationError : null}
                required
              />

              {/* Quick suggestion tags */}
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {PRESET_DESTINATIONS.slice(0, 4).map((preset) => (
                  <button
                    key={preset.city}
                    type="button"
                    onClick={() => handleDestinationSelect(preset)}
                    style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      background: 'rgba(1, 121, 111, 0.08)',
                      color: '#01796F',
                      border: '1px solid rgba(1, 121, 111, 0.2)',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                  >
                    {preset.city}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-In Date */}
            <div style={{ textAlign: 'left' }}>
              <label
                htmlFor="hotel-checkin"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '0.4rem',
                }}
              >
                <i className="fas fa-calendar-check" style={{ color: '#01796F', marginRight: '0.4rem' }} />
                Arrivée
              </label>
              <input
                id="hotel-checkin"
                type="date"
                min={today}
                value={checkIn}
                onChange={(e) => handleCheckInChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  fontSize: '0.95rem',
                }}
              />
            </div>

            {/* Check-Out Date */}
            <div style={{ textAlign: 'left' }}>
              <label
                htmlFor="hotel-checkout"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '0.4rem',
                }}
              >
                <i className="fas fa-calendar-times" style={{ color: '#01796F', marginRight: '0.4rem' }} />
                Départ
              </label>
              <input
                id="hotel-checkout"
                type="date"
                min={minCheckOut}
                value={checkOut}
                onChange={(e) => handleCheckOutChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: isInvalidDateRange ? '1px solid #ef5350' : '1px solid #ccc',
                  boxSizing: 'border-box',
                  fontSize: '0.95rem',
                }}
              />
              {isInvalidDateRange && (
                <span style={{ display: 'block', fontSize: '0.75rem', color: '#ef5350', marginTop: '0.25rem' }}>
                  Min. 1 nuit requise
                </span>
              )}
            </div>

            {/* Rooms & Occupancy Trigger */}
            <div style={{ textAlign: 'left', position: 'relative' }}>
              <label
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '0.4rem',
                }}
              >
                <i className="fas fa-user-friends" style={{ color: '#01796F', marginRight: '0.4rem' }} />
                Chambres &amp; Voyageurs
              </label>
              <button
                type="button"
                onClick={() => setShowOccupancyModal(!showOccupancyModal)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  background: '#fff',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  {occupancies.length} ch., {totalAdults} ad.
                  {totalChildren > 0 ? `, ${totalChildren} enf.` : ''}
                </span>
                <i className={`fas fa-chevron-${showOccupancyModal ? 'up' : 'down'}`} style={{ color: '#888' }} />
              </button>

              {/* Occupancy Dropdown Popover */}
              {showOccupancyModal && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 50,
                    marginTop: '0.5rem',
                    background: '#fff',
                    borderRadius: '8px',
                    boxShadow: '0 8px 25px rgba(0,0,0,0.2)',
                    border: '1px solid #e0e0e0',
                    padding: '1.25rem',
                    minWidth: '280px',
                  }}
                >
                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {occupancies.map((room, roomIdx) => (
                      <div
                        key={roomIdx}
                        style={{
                          paddingBottom: '1rem',
                          marginBottom: '1rem',
                          borderBottom: roomIdx < occupancies.length - 1 ? '1px solid #eee' : 'none',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#01796F' }}>
                            Chambre {roomIdx + 1}
                          </span>
                          {occupancies.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRoom(roomIdx)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#e53935',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                              }}
                            >
                              <i className="fas fa-trash-alt" /> Retirer
                            </button>
                          )}
                        </div>

                        {/* Adults counter */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <span style={{ fontSize: '0.85rem' }}>Adultes</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleAdultsChange(roomIdx, -1)}
                              disabled={room.adults <= 1}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                background: '#f5f5f5',
                                cursor: room.adults <= 1 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 600 }}>
                              {room.adults}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAdultsChange(roomIdx, 1)}
                              disabled={room.adults >= 4}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                background: '#f5f5f5',
                                cursor: room.adults >= 4 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Children counter */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.5rem',
                          }}
                        >
                          <span style={{ fontSize: '0.85rem' }}>Enfants (0-17 ans)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <button
                              type="button"
                              onClick={() => handleChildrenCountChange(roomIdx, -1)}
                              disabled={(room.childrenAges?.length || 0) <= 0}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                background: '#f5f5f5',
                                cursor: (room.childrenAges?.length || 0) <= 0 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              -
                            </button>
                            <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 600 }}>
                              {room.childrenAges?.length || 0}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleChildrenCountChange(roomIdx, 1)}
                              disabled={(room.childrenAges?.length || 0) >= 3}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                background: '#f5f5f5',
                                cursor: (room.childrenAges?.length || 0) >= 3 ? 'not-allowed' : 'pointer',
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Child ages */}
                        {(room.childrenAges || []).length > 0 && (
                          <div style={{ marginTop: '0.5rem', padding: '0.5rem', background: '#f9f9f9', borderRadius: '4px' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#555' }}>
                              Âge des enfants à l&apos;arrivée :
                            </span>
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                              {room.childrenAges!.map((age, childIdx) => (
                                <div key={childIdx} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                  <span style={{ fontSize: '0.7rem' }}>Enf. {childIdx + 1} :</span>
                                  <select
                                    value={age}
                                    onChange={(e) => handleChildAgeChange(roomIdx, childIdx, Number(e.target.value))}
                                    style={{ padding: '0.2rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem' }}
                                  >
                                    {Array.from({ length: 18 }).map((_, a) => (
                                      <option key={a} value={a}>
                                        {a} an{a > 1 ? 's' : ''}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {occupancies.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddRoom}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        marginTop: '0.5rem',
                        background: 'rgba(1, 121, 111, 0.08)',
                        color: '#01796F',
                        border: '1px dashed #01796F',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      + Ajouter une chambre
                    </button>
                  )}

                  {/* Nationality selector */}
                  <div style={{ marginTop: '0.75rem', borderTop: '1px solid #eee', paddingTop: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.2rem' }}>
                      Nationalité du voyageur :
                    </label>
                    <select
                      value={guestNationality}
                      onChange={(e) => setGuestNationality(e.target.value)}
                      style={{ width: '100%', padding: '0.4rem', borderRadius: '4px', fontSize: '0.8rem' }}
                    >
                      <option value="MA">Maroc (MA)</option>
                      <option value="FR">France (FR)</option>
                      <option value="ES">Espagne (ES)</option>
                      <option value="US">États-Unis (US)</option>
                      <option value="GB">Royaume-Uni (GB)</option>
                      <option value="DE">Allemagne (DE)</option>
                      <option value="AE">Émirats arabes unis (AE)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOccupancyModal(false)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      marginTop: '0.75rem',
                      background: '#01796F',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                    }}
                  >
                    Terminé
                  </button>
                </div>
              )}
            </div>

            {/* Search Submit Button */}
            <div style={{ alignSelf: 'flex-end', width: '100%' }}>
              <button
                type="submit"
                className="btn-booking"
                disabled={isSearching}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  cursor: isSearching ? 'not-allowed' : 'pointer',
                  opacity: isSearching ? 0.7 : 1,
                  color: '#fff',
                  border: 'none',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#01796F',
                }}
              >
                {isSearching ? (
                  <i className="fas fa-spinner fa-spin" />
                ) : (
                  <i className="fas fa-search" style={{ marginRight: '0.4rem' }} />
                )}
                {isSearching ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
          </form>

          {/* Validation Alert */}
          {validationError && (
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 83, 80, 0.15)',
                border: '1px solid #ef5350',
                borderRadius: '8px',
                color: '#ffebee',
                fontWeight: 600,
                fontSize: '0.9rem',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <i className="fas fa-exclamation-circle" style={{ color: '#ef5350' }} />
              {validationError}
            </div>
          )}
        </div>
      </section>

      {/* ==================== DESTINATION GUIDE & MAP (PHASE 26) ==================== */}
      {selectedGeoPlace && selectedGeoPlace.latitude && selectedGeoPlace.longitude && showDestinationGuide && (
        <section style={{ padding: '2rem 1rem 0', background: 'var(--bg, #fcfcfc)' }}>
          <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <div
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: '1px solid #e0e0e0',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                marginBottom: '1rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#01796F', margin: 0 }}>
                    <i className="fas fa-map-marked-alt" style={{ marginRight: '0.5rem' }} />
                    {selectedGeoPlace.city || selectedGeoPlace.name} — Carte &amp; Lieux Remarquables
                  </h2>
                  <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>
                    {selectedGeoPlace.state ? `${selectedGeoPlace.state}, ` : ''}{selectedGeoPlace.country || ''} • Coordonnées: {selectedGeoPlace.latitude.toFixed(4)}, {selectedGeoPlace.longitude.toFixed(4)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDestinationGuide(false)}
                  style={{
                    background: 'none',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '0.4rem 0.8rem',
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    color: '#666',
                  }}
                >
                  Masquer la carte
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <DestinationWeather
                  latitude={selectedGeoPlace.latitude}
                  longitude={selectedGeoPlace.longitude}
                  destinationName={selectedGeoPlace.city || selectedGeoPlace.name}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <DestinationImageGallery
                  city={selectedGeoPlace.city || selectedGeoPlace.name}
                  country={selectedGeoPlace.country}
                  countryCode={selectedGeoPlace.countryCode}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                <GeoMap
                  latitude={selectedGeoPlace.latitude}
                  longitude={selectedGeoPlace.longitude}
                  placeName={selectedGeoPlace.city || selectedGeoPlace.name}
                  pois={destinationPois}
                  selectedPoi={selectedPoi}
                  onSelectPoi={(poi) => setSelectedPoi(poi)}
                  height={360}
                />
                <NearbyPoiPanel
                  pois={destinationPois}
                  isLoading={isLoadingPois}
                  selectedPoi={selectedPoi}
                  onSelectPoi={(poi) => setSelectedPoi(poi)}
                  destinationName={selectedGeoPlace.city || selectedGeoPlace.name}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== FILTER TABS & RESULTS ==================== */}
      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Filter Categories */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Tous les hébergements', value: 'ALL' as const },
              { label: 'Hôtels & Riads', value: 'HOTEL_RIAD' as const },
              { label: 'Villas & Maisons', value: 'VILLA_HOUSE' as const },
              { label: 'Appartements', value: 'APARTMENT' as const },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterType(tab.value)}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '30px',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  backgroundColor: filterType === tab.value ? '#01796F' : 'var(--card, #eee)',
                  color: filterType === tab.value ? '#fff' : 'var(--text, #333)',
                  boxShadow: filterType === tab.value ? '0 4px 10px rgba(1, 121, 111, 0.3)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results State Management */}
          {!hasSearched ? (
            <EmptyState
              icon="fa-hotel"
              title="Recherchez vos hébergements en temps réel"
              description="Renseignez votre destination et vos dates de séjour ci-dessus pour accéder aux disponibilités et tarifs réels en direct via le réseau Nuitee Connect."
            />
          ) : isSearching ? (
            <HotelSkeleton count={6} />
          ) : searchStatus === 'ERROR' ? (
            <ErrorState
              title="Erreur de recherche"
              message={searchMessage || 'Une erreur est survenue lors de la recherche des hébergements.'}
              onRetry={() => { setHasSearched(false); setSearchStatus(null); setAllHotels([]); }}
            />
          ) : filteredHotels.length === 0 ? (
            <EmptyState
              icon="fa-bed"
              title="Aucun hébergement trouvé"
              description={
                allHotels.length > 0 && filterType !== 'ALL'
                  ? 'Aucun hébergement de cette catégorie dans les résultats. Essayez "Tous les hébergements".'
                  : searchStatus === 'PROVIDER_UNAVAILABLE'
                  ? (searchMessage || 'Le service Nuitee Connect est temporairement indisponible.')
                  : (searchMessage || "Aucun hôtel disponible pour cette destination et ces dates. Essayez d'autres dates ou une autre ville.")
              }
            />
          ) : (
            /* Results Grid */
            <div>
              {/* Sort + chips toolbar */}
              <SortBar
                count={sortedHotels.length}
                resultLabel="hébergement"
                sortOptions={[
                  { value: 'PRICE_ASC' as HotelSortKey, label: 'Prix croissant' },
                  { value: 'PRICE_DESC' as HotelSortKey, label: 'Prix décroissant' },
                  { value: 'STARS_DESC' as HotelSortKey, label: 'Étoiles (meilleures)' },
                ]}
                currentSort={sortKey}
                onSortChange={setSortKey}
                activeChips={hotelActiveChips}
                onChipRemove={(key) => {
                  if (key === filterType) setFilterType('ALL');
                }}
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '2rem',
                }}
              >
                {sortedHotels.map((item) => {
                  const hotelId = item.hotelId || item.id || item.offerId;
                  const isExpanded = expandedHotelId === hotelId;
                  const roomOffers = item.roomOffers || [];

                  return (
                    <div
                      key={hotelId}
                      style={{
                        background: 'var(--card, #fff)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                        display: 'flex',
                        flexDirection: 'column',
                        border: '1px solid rgba(0,0,0,0.05)',
                      }}
                    >
                      {/* Image & Badges */}
                      <div style={{ height: '210px', overflow: 'hidden', position: 'relative' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.imageUrl || '/image/hotels.jpg'}
                          alt={item.name || item.hotelName || 'Hôtel'}
                          loading="lazy"
                          decoding="async"
                          onError={(event) => {
                            event.currentTarget.onerror = null;
                            event.currentTarget.src = '/image/hotels.jpg';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            top: '10px',
                            left: '10px',
                            background: 'rgba(0, 27, 26, 0.8)',
                            color: '#fff',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                          }}
                        >
                          {item.provider || 'NUITEE'}
                        </div>

                        {/* Stars */}
                        {(item.starRating || item.rating) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '10px',
                              right: '10px',
                              background: 'rgba(0,0,0,0.7)',
                              color: '#ffb300',
                              padding: '0.25rem 0.6rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.25rem',
                            }}
                          >
                            <i className="fas fa-star" />
                            <span>{item.starRating || item.rating}</span>
                          </div>
                        )}
                      </div>

                      {/* Card Content */}
                      <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ marginBottom: '0.75rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.35rem', lineHeight: '1.3' }}>
                            {item.name || item.hotelName}
                          </h3>
                          <p style={{ color: '#666', fontSize: '0.85rem' }}>
                            <i className="fas fa-map-marker-alt" style={{ color: '#01796F', marginRight: '0.4rem' }} />
                            {item.address ? `${item.address}, ` : ''}{item.city}, {item.country}
                          </p>
                        </div>

                        {/* Review Score */}
                        {item.reviewScore && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <span
                              style={{
                                background: '#01796F',
                                color: '#fff',
                                padding: '0.2rem 0.5rem',
                                borderRadius: '4px',
                                fontWeight: 800,
                                fontSize: '0.8rem',
                              }}
                            >
                              {item.reviewScore.toFixed(1)}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#555' }}>
                              {item.reviewScore >= 8.5 ? 'Excellent' : item.reviewScore >= 7.5 ? 'Très bien' : 'Bien'}
                              {item.reviewCount ? ` (${item.reviewCount} avis)` : ''}
                            </span>
                          </div>
                        )}

                        {/* Price & Primary Action */}
                        <div
                          style={{
                            marginTop: 'auto',
                            paddingTop: '1rem',
                            borderTop: '1px solid #f0f0f0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#888', display: 'block' }}>À partir de</span>
                            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#01796F' }}>
                              <PriceDisplay conversion={item.priceConversion} amount={item.pricePerNight} currency={item.currency} />
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}> / nuit</span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Link
                              href={`/hotels/${encodeURIComponent(item.offerId || hotelId)}`}
                              style={{
                                padding: '0.6rem 0.95rem',
                                borderRadius: '6px',
                                border: '1.5px solid #01796F',
                                color: '#01796F',
                                background: '#fff',
                                textDecoration: 'none',
                                fontWeight: 700,
                                fontSize: '0.85rem',
                              }}
                            >
                              Détails
                            </Link>

                            {roomOffers.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => toggleExpandHotel(hotelId)}
                                style={{
                                  padding: '0.65rem 1.1rem',
                                  borderRadius: '6px',
                                  background: isExpanded ? '#eee' : '#01796F',
                                  color: isExpanded ? '#333' : '#fff',
                                  border: 'none',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  fontSize: '0.85rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.4rem',
                                }}
                              >
                                <span>{isExpanded ? 'Masquer offres' : `Offres (${roomOffers.length})`}</span>
                                <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} />
                              </button>
                            ) : (
                              <Link
                                href={`/booking?serviceType=HOTEL&serviceId=${hotelId}&offerId=${item.offerId}&serviceTitle=${encodeURIComponent(item.name || 'Hôtel')}&price=${item.pricePerNight}&currency=${item.currency}`}
                                className="btn-booking"
                                style={{
                                  padding: '0.65rem 1.25rem',
                                  borderRadius: '6px',
                                  color: '#fff',
                                  textDecoration: 'none',
                                  fontWeight: 700,
                                  fontSize: '0.85rem',
                                }}
                              >
                                Réserver
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Expanded Room Offers List */}
                        {isExpanded && roomOffers.length > 0 && (
                          <div
                            style={{
                              marginTop: '1.25rem',
                              paddingTop: '1rem',
                              borderTop: '1px dashed #ddd',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem',
                            }}
                          >
                            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#333', margin: 0 }}>
                              Chambres et tarifs disponibles :
                            </h4>

                            {roomOffers.map((offer: HotelRoomOffer) => (
                              <div
                                key={offer.offerId}
                                style={{
                                  background: '#f9fbfb',
                                  border: '1px solid #e0f2f1',
                                  borderRadius: '8px',
                                  padding: '0.85rem',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#001b1a' }}>
                                    {offer.roomName}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.2rem' }}>
                                    {offer.boardName || offer.boardType || 'Hébergement seul'}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>
                                    {offer.refundable ? (
                                      <span style={{ color: '#2e7d32', fontWeight: 600 }}>
                                        <i className="fas fa-check" style={{ marginRight: '0.25rem' }} />
                                        Annulation gratuite
                                      </span>
                                    ) : (
                                      <span style={{ color: '#c62828' }}>
                                        Non remboursable
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#01796F' }}>
                                    <PriceDisplay conversion={offer.priceConversion} amount={offer.price} currency={offer.currency} />
                                  </div>
                                  {offer.pricePerNight && (
                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                                      (<PriceDisplay conversion={offer.pricePerNightConversion} amount={offer.pricePerNight} currency={offer.currency} />/nuit)
                                    </div>
                                  )}
                                  <Link
                                    href={`/booking?serviceType=HOTEL&serviceId=${hotelId}&offerId=${encodeURIComponent(offer.offerId)}&serviceTitle=${encodeURIComponent((item.name || 'Hôtel') + ' - ' + offer.roomName)}&price=${offer.price}&currency=${offer.currency}`}
                                    style={{
                                      display: 'inline-block',
                                      marginTop: '0.4rem',
                                      padding: '0.4rem 0.85rem',
                                      background: '#01796F',
                                      color: '#fff',
                                      borderRadius: '4px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      textDecoration: 'none',
                                    }}
                                  >
                                    Sélectionner
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
