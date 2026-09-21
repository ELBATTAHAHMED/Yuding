'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import { ApiError } from '@/lib/api-client';
import type { HotelOffer, HotelRoomOffer, RoomOccupancy } from '@/types/travel.types';

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
  const [hotels, setHotels] = useState<HotelOffer[]>([]);
  const [expandedHotelId, setExpandedHotelId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string | null>(null);
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];
  const minCheckOut = checkIn ? addDays(checkIn, 1) : addDays(today, 1);

  const totalAdults = occupancies.reduce((sum, r) => sum + r.adults, 0);
  const totalChildren = occupancies.reduce((sum, r) => sum + (r.childrenAges?.length || 0), 0);

  const handleDestinationSelect = (preset: PresetDestination) => {
    setDestinationInput(preset.label);
    setSelectedCity(preset.city);
    setSelectedCountryCode(preset.countryCode);
    setValidationError(null);
  };

  const handleDestinationChange = (val: string) => {
    setDestinationInput(val);
    const match = PRESET_DESTINATIONS.find((p) => p.label.toLowerCase() === val.toLowerCase());
    if (match) {
      setSelectedCity(match.city);
      setSelectedCountryCode(match.countryCode);
    } else {
      setSelectedCity(val.trim());
    }
    setValidationError(null);
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
        propertyType: filterType !== 'ALL' ? filterType : undefined,
      });

      setHotels(data.results || []);
      setSearchStatus(data.status);
      setSearchMessage(data.message);
    } catch (err: unknown) {
      setHotels([]);
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

  const filteredHotels = hotels.filter((h) => {
    if (filterType === 'ALL') return true;
    return h.type === filterType;
  });

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
            {/* Destination Field with Popular Picks */}
            <div style={{ textAlign: 'left', position: 'relative' }}>
              <label
                htmlFor="hotel-destination"
                style={{
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  marginBottom: '0.4rem',
                }}
              >
                <i className="fas fa-map-marker-alt" style={{ color: '#01796F', marginRight: '0.4rem' }} />
                Destination / Ville
              </label>
              <input
                id="hotel-destination"
                type="text"
                list="popular-destinations"
                placeholder="Ex: Marrakech, Casablanca, Paris"
                value={destinationInput}
                onChange={(e) => handleDestinationChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #ccc',
                  boxSizing: 'border-box',
                  fontSize: '0.95rem',
                }}
              />
              <datalist id="popular-destinations">
                {PRESET_DESTINATIONS.map((preset) => (
                  <option key={preset.label} value={preset.label} />
                ))}
              </datalist>

              {/* Quick suggestion tags */}
              <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                {PRESET_DESTINATIONS.slice(0, 3).map((preset) => (
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

      {/* ==================== FILTER TABS & RESULTS ==================== */}
      <section style={{ padding: '3.5rem 1rem' }}>
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Filter Categories */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Tous les hébergements', value: 'ALL' },
              { label: 'Hôtels & Riads', value: 'HOTEL' },
              { label: 'Villas & Maisons', value: 'VACATION_HOME' },
              { label: 'Appartements', value: 'APARTMENT' },
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
            /* Initial State */
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                background: 'var(--card, #fff)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(1, 121, 111, 0.1)',
                  color: '#01796F',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                <i className="fas fa-hotel" />
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Recherchez vos hébergements en temps réel
              </h3>
              <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                Renseignez votre destination et vos dates de séjour ci-dessus pour accéder aux disponibilités et tarifs réels en direct via le réseau Nuitee Connect.
              </p>
            </div>
          ) : isSearching ? (
            /* Loading State */
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem',
                background: 'var(--card, #fff)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
              }}
            >
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '2.5rem', color: '#01796F', marginBottom: '1.2rem', display: 'block' }} />
              <p style={{ color: '#555', fontWeight: 600, fontSize: '1.05rem' }}>
                Recherche des hébergements en direct via Nuitee Connect...
              </p>
              <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.4rem' }}>
                Interrogation des disponibilités et des tarifs fournisseurs en temps réel
              </p>
            </div>
          ) : filteredHotels.length === 0 ? (
            /* Empty State */
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1.5rem',
                background: 'var(--card, #fff)',
                borderRadius: '12px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.06)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: 'rgba(239, 83, 80, 0.1)',
                  color: '#e53935',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.8rem',
                  margin: '0 auto 1.25rem',
                }}
              >
                <i className="fas fa-bed" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Aucun hébergement trouvé pour ces critères
              </h3>
              <p style={{ color: '#666', maxWidth: '600px', margin: '0 auto', fontSize: '0.95rem', lineHeight: '1.6' }}>
                {searchMessage ||
                  'Aucun hôtel disponible pour cette destination et ces dates auprès du fournisseur Nuitee Connect. Essayez d\'autres dates ou une autre ville.'}
              </p>
              {searchStatus === 'PROVIDER_UNAVAILABLE' && (
                <div style={{ marginTop: '1rem', color: '#e65100', fontSize: '0.85rem', fontWeight: 600 }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: '0.4rem' }} />
                  Le service Nuitee Connect est temporairement indisponible.
                </div>
              )}
            </div>
          ) : (
            /* Results Grid */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  {filteredHotels.length} hébergement{filteredHotels.length > 1 ? 's' : ''} disponible{filteredHotels.length > 1 ? 's' : ''}
                </h2>
                <span
                  style={{
                    background: 'rgba(1, 121, 111, 0.1)',
                    color: '#01796F',
                    padding: '0.35rem 0.85rem',
                    borderRadius: '20px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  <i className="fas fa-check-circle" style={{ marginRight: '0.35rem' }} />
                  Tarifs vérifiés Nuitee Connect
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: '2rem',
                }}
              >
                {filteredHotels.map((item) => {
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
                              {item.pricePerNight} {item.currency}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#888' }}> / nuit</span>
                          </div>

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
                                    {offer.price} {offer.currency}
                                  </div>
                                  {offer.pricePerNight && (
                                    <div style={{ fontSize: '0.7rem', color: '#888' }}>
                                      ({offer.pricePerNight} {offer.currency}/nuit)
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
