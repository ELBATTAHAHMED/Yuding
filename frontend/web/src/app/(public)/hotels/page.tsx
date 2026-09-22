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
import { TravelHero, TravelPage } from '@/components/travel';
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
    <TravelPage page="hotels">
      <TravelHero
        title="Hébergements"
        subtitle="Des séjours sélectionnés par nos partenaires, partout dans le monde."
        destination={selectedCity || destinationInput || undefined}
        country={selectedGeoPlace?.country}
        icon="fas fa-bed"
        compact={hasSearched}
      />
      {/* ==================== COMPACT SEARCH HEADER ==================== */}
      <section className="travel-search-panel bg-[#001b1a] text-white py-6 px-4 border-b border-[#01796F]/20">
        <div className="max-w-6xl mx-auto">
          <div className="travel-search-panel__heading mb-4">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-0.5">
              Hébergements
            </h1>
            <p className="text-xs md:text-sm text-[#b2dfdb]">
              Trouvez et réservez des hôtels et riads partenaires au meilleur tarif
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="bg-[#062523] p-3.5 md:p-4 rounded-xl shadow-lg border border-[#01796F]/30 text-white"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1.3fr_auto] gap-2.5 items-end">
              {/* Destination Field with GeoPlaceSelector */}
              <div className="text-left relative min-w-0">
                <GeoPlaceSelector
                  id="hotel-destination"
                  label="Destination / Ville"
                  placeholder="Ville ou lieu (ex: Marrakech, Paris, Rome)..."
                  type="city"
                  selectedPlace={selectedGeoPlace}
                  onSelect={handleGeoPlaceSelect}
                  error={validationError && !destinationInput.trim() ? validationError : null}
                  required
                />
              </div>

              {/* Check-In Date */}
              <div className="text-left min-w-0">
                <label
                  htmlFor="hotel-checkin"
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider"
                >
                  <i className="fas fa-calendar-check mr-1.5 text-[#02E0D5]" />
                  Arrivée
                </label>
                <input
                  id="hotel-checkin"
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => handleCheckInChange(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all"
                />
              </div>

              {/* Check-Out Date */}
              <div className="text-left min-w-0">
                <label
                  htmlFor="hotel-checkout"
                  className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider"
                >
                  <i className="fas fa-calendar-times mr-1.5 text-[#02E0D5]" />
                  Départ
                </label>
                <input
                  id="hotel-checkout"
                  type="date"
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  className={`w-full h-10 px-3 rounded-lg border ${
                    isInvalidDateRange ? 'border-red-500' : 'border-[#01796F]/40'
                  } bg-[#021817] text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all`}
                />
                {isInvalidDateRange && (
                  <span className="block text-[11px] text-red-400 mt-0.5">Min. 1 nuit</span>
                )}
              </div>

              {/* Rooms & Occupancy Trigger */}
              <div className="text-left relative min-w-0">
                <label className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider">
                  <i className="fas fa-user-friends mr-1.5 text-[#02E0D5]" />
                  Voyageurs
                </label>
                <button
                  type="button"
                  onClick={() => setShowOccupancyModal(!showOccupancyModal)}
                  className="w-full h-10 px-3 rounded-lg border border-[#01796F]/40 bg-[#021817] text-white text-xs flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-[#02E0D5] transition-all"
                >
                  <span className="truncate">
                    {occupancies.length} ch., {totalAdults} ad.
                    {totalChildren > 0 ? `, ${totalChildren} enf.` : ''}
                  </span>
                  <i className={`fas fa-chevron-${showOccupancyModal ? 'up' : 'down'} text-[#80cbc4] text-xs ml-1`} />
                </button>

                {/* Occupancy Dropdown Popover */}
                {showOccupancyModal && (
                  <div className="absolute top-[calc(100%+6px)] left-0 right-0 z-50 bg-[#062523] text-white rounded-xl shadow-2xl border border-[#01796F]/40 p-4 min-w-[280px]">
                    <div className="max-h-64 overflow-y-auto divide-y divide-[#01796F]/20">
                      {occupancies.map((room, roomIdx) => (
                        <div key={roomIdx} className="py-2.5 first:pt-0 last:pb-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="font-bold text-xs text-[#02E0D5] uppercase">
                              Chambre {roomIdx + 1}
                            </span>
                            {occupancies.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveRoom(roomIdx)}
                                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                              >
                                <i className="fas fa-trash-alt text-[10px]" /> Retirer
                              </button>
                            )}
                          </div>

                          {/* Adults counter */}
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-medium text-slate-200">Adultes</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAdultsChange(roomIdx, -1)}
                                disabled={room.adults <= 1}
                                className="w-7 h-7 rounded border border-[#01796F]/40 bg-[#021817] text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-bold text-xs text-white">{room.adults}</span>
                              <button
                                type="button"
                                onClick={() => handleAdultsChange(roomIdx, 1)}
                                disabled={room.adults >= 4}
                                className="w-7 h-7 rounded border border-[#01796F]/40 bg-[#021817] text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Children counter */}
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-200">Enfants (0-17 ans)</span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleChildrenCountChange(roomIdx, -1)}
                                disabled={(room.childrenAges?.length || 0) <= 0}
                                className="w-7 h-7 rounded border border-[#01796F]/40 bg-[#021817] text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center"
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-bold text-xs text-white">{room.childrenAges?.length || 0}</span>
                              <button
                                type="button"
                                onClick={() => handleChildrenCountChange(roomIdx, 1)}
                                disabled={(room.childrenAges?.length || 0) >= 3}
                                className="w-7 h-7 rounded border border-[#01796F]/40 bg-[#021817] text-white disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          {/* Child ages */}
                          {(room.childrenAges || []).length > 0 && (
                            <div className="mt-2 p-2 bg-[#021817] rounded border border-[#01796F]/30">
                              <span className="text-[10px] font-semibold text-[#80cbc4] block mb-1">
                                Âge des enfants :
                              </span>
                              <div className="flex gap-2 flex-wrap">
                                {room.childrenAges!.map((age, childIdx) => (
                                  <div key={childIdx} className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-300">Enf. {childIdx + 1}:</span>
                                    <select
                                      value={age}
                                      onChange={(e) => handleChildAgeChange(roomIdx, childIdx, Number(e.target.value))}
                                      className="px-1.5 py-0.5 rounded border border-[#01796F]/40 text-xs bg-[#062523] text-white"
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
                        className="w-full py-1.5 mt-2.5 text-xs font-semibold text-[#02E0D5] bg-[#02E0D5]/10 hover:bg-[#02E0D5]/15 border border-dashed border-[#02E0D5]/30 rounded-lg transition-colors"
                      >
                        + Ajouter une chambre
                      </button>
                    )}

                    {/* Nationality selector */}
                    <div className="mt-2.5 pt-2.5 border-t border-[#01796F]/20">
                      <label className="block text-[11px] font-medium text-slate-300 mb-1">
                        Nationalité :
                      </label>
                      <select
                        value={guestNationality}
                        onChange={(e) => setGuestNationality(e.target.value)}
                        className="w-full px-2 py-1.5 rounded-lg border border-[#01796F]/40 text-xs bg-[#021817] text-white"
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
                      className="w-full py-2 mt-2.5 bg-[#01796F] hover:bg-[#005951] text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      Appliquer
                    </button>
                  </div>
                )}
              </div>

              {/* Search Submit Button */}
              <div className="w-full lg:w-auto">
                <button
                  type="submit"
                  disabled={isSearching}
                  className="w-full lg:w-auto h-10 px-6 bg-[#01796F] hover:bg-[#005951] text-white font-semibold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isSearching ? (
                    <i className="fas fa-spinner fa-spin" />
                  ) : (
                    <i className="fas fa-search text-xs" />
                  )}
                  <span>{isSearching ? 'Recherche...' : 'Rechercher'}</span>
                </button>
              </div>
            </div>
          </form>

          {/* Validation Alert */}
          {validationError && (
            <div className="mt-2.5 px-3 py-1.5 bg-red-950/60 border border-red-500/50 rounded-md text-red-200 text-xs flex items-center gap-2">
              <i className="fas fa-exclamation-circle text-red-400" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Popular Destinations subtle helper */}
          <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] text-[#80cbc4]/80">
            <span className="font-medium text-slate-400">Suggestions :</span>
            {PRESET_DESTINATIONS.slice(0, 5).map((preset) => (
              <button
                key={preset.city}
                type="button"
                onClick={() => handleDestinationSelect(preset)}
                className="hover:text-white underline underline-offset-2 transition-colors mr-1 bg-transparent border-none p-0 cursor-pointer text-[#80cbc4]"
              >
                {preset.city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== DESTINATION GUIDE & MAP (PHASE 26) ==================== */}
      {selectedGeoPlace && selectedGeoPlace.latitude && selectedGeoPlace.longitude && showDestinationGuide && (
        <section className="py-6 px-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <div className="max-w-6xl mx-auto">
            <div
              style={{
                background: 'var(--card, #fff)',
                borderRadius: '16px',
                border: '1px solid var(--border, #e2e8f0)',
                padding: '1.5rem',
                boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
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
      <section className="py-8 px-4 bg-slate-50 dark:bg-slate-950 min-h-[60vh]">
        <div className="max-w-6xl mx-auto">
          {/* Filter Categories */}
          <div className="flex justify-center gap-2 mb-6 flex-wrap">
            {[
              { label: 'Tous les hébergements', value: 'ALL' as const },
              { label: 'Hôtels & Riads', value: 'HOTEL_RIAD' as const },
              { label: 'Villas & Maisons', value: 'VILLA_HOUSE' as const },
              { label: 'Appartements', value: 'APARTMENT' as const },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterType(tab.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold transition-all border ${
                  filterType === tab.value
                    ? 'bg-[#01796F] text-white border-[#01796F] shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#01796F]/40'
                }`}
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
    </TravelPage>
  );
}
