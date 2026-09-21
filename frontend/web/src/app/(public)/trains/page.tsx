'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { travelService } from '@/services/travel.service';
import type { TrainOffer, TrainStation } from '@/types/travel.types';
import { StationSelector } from '@/components/travel/StationSelector';
import { TrainCard } from '@/components/travel/TrainCard';

const TODAY = new Date().toISOString().split('T')[0];

export default function TrainsPage() {
  const [stations, setStations] = useState<TrainStation[]>([]);
  const [originStation, setOriginStation] = useState<TrainStation | null>(null);
  const [destinationStation, setDestinationStation] = useState<TrainStation | null>(null);
  const [date, setDate] = useState(TODAY);
  const [departureTime, setDepartureTime] = useState('');

  const [trains, setTrains] = useState<TrainOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStations, setLoadingStations] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [outdatedNotice, setOutdatedNotice] = useState<string | null>(null);
  const [providerMessage, setProviderMessage] = useState<string | null>(null);

  // Filters
  const [directOnly, setDirectOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEPARTURE' | 'DURATION'>('DEPARTURE');

  // Fetch station directory on mount
  useEffect(() => {
    let mounted = true;
    travelService
      .getTrainStations()
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setStations(data);
        }
      })
      .catch(() => {
        // Fail silently - station autocomplete will show empty
      })
      .finally(() => {
        if (mounted) setLoadingStations(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleSwap = () => {
    const temp = originStation;
    setOriginStation(destinationStation);
    setDestinationStation(temp);
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!originStation) {
      setErrorMessage('Veuillez sélectionner une gare de départ.');
      return;
    }
    if (!destinationStation) {
      setErrorMessage('Veuillez sélectionner une gare d’arrivée.');
      return;
    }
    if (originStation.id.toLowerCase() === destinationStation.id.toLowerCase()) {
      setErrorMessage('La gare de départ et la gare d’arrivée ne peuvent pas être identiques.');
      return;
    }
    if (!date) {
      setErrorMessage('Veuillez sélectionner une date de voyage.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setOutdatedNotice(null);
    setProviderMessage(null);
    setHasSearched(true);

    try {
      const originCoords =
        originStation.latitude && originStation.longitude
          ? `${originStation.latitude},${originStation.longitude}`
          : originStation.id.includes(',')
          ? originStation.id
          : undefined;

      const destCoords =
        destinationStation.latitude && destinationStation.longitude
          ? `${destinationStation.latitude},${destinationStation.longitude}`
          : destinationStation.id.includes(',')
          ? destinationStation.id
          : undefined;

      const response = await travelService.searchTrains({
        originStation: originStation.name || originStation.id,
        destinationStation: destinationStation.name || destinationStation.id,
        date,
        departureTime: departureTime || undefined,
        currency: 'EUR',
        originCoordinates: originCoords,
        destinationCoordinates: destCoords,
        originCountryCode: originStation.countryCode,
        destinationCountryCode: destinationStation.countryCode,
      });

      if (response.status === 'PROVIDER_UNAVAILABLE') {
        setProviderMessage(response.message);
        setTrains([]);
      } else {
        setTrains(response.results || []);
      }
    } catch (err: unknown) {
      setTrains([]);
      const errMsg = err instanceof Error ? err.message : String(err);

      // Detect Freshness Gate rejection (SCHEDULE_DATA_OUTDATED)
      if (
        errMsg.includes('SCHEDULE_DATA_OUTDATED') ||
        errMsg.includes('422') ||
        errMsg.includes('not available for date') ||
        errMsg.includes('outside feed validity') ||
        errMsg.includes('valid from')
      ) {
        setOutdatedNotice(
          'Les horaires pour cette date ne sont pas disponibles dans le jeu de données GTFS (validité du calendrier dépassée). Conformément aux règles de transparence Yuding, aucun horaire obsolète ou inféré n’est présenté comme horaire officiel en temps réel.'
        );
      } else if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate')) {
        setErrorMessage('Limite de requêtes atteinte auprès du fournisseur de données. Veuillez patienter un instant.');
      } else if (errMsg.includes('TIMEOUT') || errMsg.toLowerCase().includes('délai')) {
        setErrorMessage('Délai d’attente dépassé lors de la consultation des horaires. Veuillez réessayer.');
      } else {
        setErrorMessage(
          'Impossible de récupérer les horaires pour ce trajet. Veuillez vérifier votre connexion ou réessayer plus tard.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Dynamically extract unique products from current results
  const availableProducts = useMemo(() => {
    const set = new Set<string>();
    trains.forEach((t) => {
      if (t.productType) set.add(t.productType);
    });
    return Array.from(set);
  }, [trains]);

  // Filter and Sort results
  const filteredTrains = useMemo(() => {
    let list = [...trains];

    if (directOnly) {
      list = list.filter((t) => t.direct);
    }

    if (selectedProduct !== 'ALL') {
      list = list.filter((t) => t.productType === selectedProduct);
    }

    list.sort((a, b) => {
      if (sortBy === 'DURATION') {
        return (a.durationMinutes || 9999) - (b.durationMinutes || 9999);
      }
      return (a.departureTime || '').localeCompare(b.departureTime || '');
    });

    return list;
  }, [trains, directOnly, selectedProduct, sortBy]);

  return (
    <div>
      {/* ==================== HERO & SEARCH SECTION ==================== */}
      <section
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0284c7 100%)',
          padding: '5rem 1rem 4rem',
          color: '#ffffff',
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
              letterSpacing: '-0.5px',
            }}
          >
            Horaires &amp; Trains
          </h1>
          <p
            style={{
              fontSize: '1.15rem',
              color: '#93c5fd',
              marginBottom: '2.5rem',
              maxWidth: '750px',
              margin: '0 auto 2.5rem',
            }}
          >
            Consultez les liaisons ferroviaires et grilles horaires au Maroc (réseau ONCF) et dans le monde entier (Transitous)
          </p>

          <form
            onSubmit={handleSearch}
            style={{
              background: '#ffffff',
              padding: '1.75rem',
              borderRadius: '16px',
              boxShadow: '0 12px 35px rgba(0, 0, 0, 0.25)',
              color: '#1e293b',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '1rem',
              alignItems: 'flex-end',
              textAlign: 'left',
            }}
          >
            {/* Origin Station */}
            <div style={{ flex: '3 1 240px' }}>
              <StationSelector
                id="originStation"
                label="Gare de départ"
                icon="fas fa-train"
                placeholder={loadingStations ? 'Chargement des gares...' : 'Gare de départ (ex: Casa, Paris, Lyon, Madrid)'}
                stations={stations}
                selectedStation={originStation}
                onSelect={(st) => {
                  setOriginStation(st);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={loadingStations}
              />
            </div>

            {/* Swap Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '4px',
              }}
            >
              <button
                type="button"
                onClick={handleSwap}
                disabled={!originStation && !destinationStation}
                title="Inverser les gares"
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '50%',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: originStation || destinationStation ? 'pointer' : 'not-allowed',
                  color: '#2563eb',
                  transition: 'all 0.2s ease',
                }}
              >
                <i className="fas fa-exchange-alt" />
              </button>
            </div>

            {/* Destination Station */}
            <div style={{ flex: '3 1 240px' }}>
              <StationSelector
                id="destinationStation"
                label="Gare d’arrivée"
                icon="fas fa-map-marker-alt"
                placeholder={loadingStations ? 'Chargement des gares...' : 'Gare d’arrivée (ex: Rabat, Tanger, Barcelone)'}
                stations={stations}
                selectedStation={destinationStation}
                onSelect={(st) => {
                  setDestinationStation(st);
                  if (errorMessage) setErrorMessage(null);
                }}
                disabled={loadingStations}
              />
            </div>

            {/* Departure Date */}
            <div style={{ flex: '2 1 150px' }}>
              <label
                htmlFor="trainDate"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: '#334155',
                }}
              >
                <i className="fas fa-calendar-alt" style={{ marginRight: '6px', color: '#2563eb' }} />
                Date de voyage
              </label>
              <input
                id="trainDate"
                type="date"
                value={date}
                min={TODAY}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (errorMessage) setErrorMessage(null);
                }}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Optional Time */}
            <div style={{ flex: '1 1 120px' }}>
              <label
                htmlFor="trainTime"
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                  color: '#334155',
                }}
              >
                <i className="fas fa-clock" style={{ marginRight: '6px', color: '#2563eb' }} />
                À partir de
              </label>
              <input
                id="trainTime"
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.65rem 0.8rem',
                  borderRadius: '8px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.95rem',
                  color: '#1e293b',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit Button */}
            <div style={{ flex: '1 1 140px' }}>
              <button
                type="submit"
                disabled={loading || !originStation || !destinationStation || !date}
                style={{
                  width: '100%',
                  padding: '0.75rem 1.5rem',
                  background:
                    loading || !originStation || !destinationStation || !date
                      ? '#94a3b8'
                      : '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor:
                    loading || !originStation || !destinationStation || !date
                      ? 'not-allowed'
                      : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxSizing: 'border-box',
                  transition: 'background 0.2s ease',
                }}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" />
                    <span>Recherche...</span>
                  </>
                ) : (
                  <>
                    <i className="fas fa-search" />
                    <span>Rechercher</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {errorMessage && (
            <div
              style={{
                marginTop: '1rem',
                background: '#fef2f2',
                color: '#b91c1c',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid #fca5a5',
                fontSize: '0.9rem',
                textAlign: 'left',
              }}
            >
              <i className="fas fa-exclamation-circle" style={{ marginRight: '8px' }} />
              {errorMessage}
            </div>
          )}
        </div>
      </section>

      {/* ==================== RESULTS SECTION ==================== */}
      <section style={{ padding: '3rem 1rem', maxWidth: '1100px', margin: '0 auto' }}>
        {/* Freshness Gate Alert (Outdated Schedule Rejection) */}
        {outdatedNotice && (
          <div
            style={{
              background: '#fffbeb',
              border: '1.5px solid #fde68a',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <i className="fas fa-info-circle" style={{ fontSize: '1.8rem', color: '#d97706', marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: '#92400e', fontWeight: 700 }}>
                  Horaires non disponibles pour cette date (Contrôle d’actualité des données)
                </h3>
                <p style={{ margin: '0 0 1rem 0', color: '#78350f', fontSize: '0.95rem', lineHeight: 1.5 }}>
                  {outdatedNotice}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
                  <a
                    href="https://www.oncf-voyages.ma"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      background: '#d97706',
                      color: '#ffffff',
                      padding: '0.6rem 1.2rem',
                      borderRadius: '8px',
                      fontWeight: 700,
                      fontSize: '0.9rem',
                      textDecoration: 'none',
                    }}
                  >
                    <span>Consulter les horaires officiels actuels sur ONCF</span>
                    <i className="fas fa-external-link-alt" />
                  </a>
                  <span style={{ fontSize: '0.8rem', color: '#92400e', fontStyle: 'italic' }}>
                    (Redirection externe vers le portail officiel de l’ONCF)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Provider Unavailable message */}
        {providerMessage && (
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            <i className="fas fa-satellite-dish" style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#94a3b8' }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>{providerMessage}</p>
          </div>
        )}

        {/* Filters and sorting bar when results exist */}
        {hasSearched && trains.length > 0 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              background: '#ffffff',
              padding: '1rem 1.25rem',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              marginBottom: '1.5rem',
            }}
          >
            <div style={{ fontWeight: 700, color: '#1e293b' }}>
              {filteredTrains.length} liaison{filteredTrains.length > 1 ? 's' : ''} disponible
              {filteredTrains.length > 1 ? 's' : ''}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              {/* Direct only toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={directOnly}
                  onChange={(e) => setDirectOnly(e.target.checked)}
                />
                <span>Directs uniquement</span>
              </label>

              {/* Product filter */}
              {availableProducts.length > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                  <span>Type :</span>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      background: '#ffffff',
                    }}
                  >
                    <option value="ALL">Tous les trains</option>
                    {availableProducts.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Sort by */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}>
                <span>Trier par :</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'DEPARTURE' | 'DURATION')}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.85rem',
                    background: '#ffffff',
                  }}
                >
                  <option value="DEPARTURE">Heure de départ</option>
                  <option value="DURATION">Durée la plus courte</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Results List */}
        {filteredTrains.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredTrains.map((train) => (
              <TrainCard key={train.offerId} offer={train} />
            ))}
          </div>
        )}

        {/* Empty Search State */}
        {hasSearched && !loading && trains.length === 0 && !outdatedNotice && !providerMessage && (
          <div
            style={{
              textAlign: 'center',
              padding: '4rem 1rem',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
            }}
          >
            <i className="fas fa-train" style={{ fontSize: '3rem', color: '#cbd5e1', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', color: '#1e293b', marginBottom: '0.5rem' }}>
              Aucun train trouvé pour cette liaison
            </h3>
            <p style={{ color: '#64748b', maxWidth: '500px', margin: '0 auto 1.5rem', fontSize: '0.95rem' }}>
              Aucune circulation directe ou horaire correspondant n’a été identifiée pour cette date ou cet horaire.
            </p>
            <a
              href="https://www.oncf-voyages.ma"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: '#2563eb',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              <span>Vérifier directement sur le site de l’ONCF</span>
              <i className="fas fa-external-link-alt" />
            </a>
          </div>
        )}

        {/* Initial Prompt State (before search) */}
        {!hasSearched && (
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              background: '#f8fafc',
              borderRadius: '12px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <i className="fas fa-route" style={{ fontSize: '2.5rem', color: '#94a3b8', marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.1rem', color: '#334155', marginBottom: '0.25rem' }}>
              Recherchez votre itinéraire en train
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
              Sélectionnez une gare de départ, une gare d’arrivée et votre date de départ pour afficher les horaires.
            </p>
          </div>
        )}

        {/* Attribution & Legal disclaimer */}
        <div
          style={{
            marginTop: '3.5rem',
            padding: '1.25rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            borderRadius: '8px',
            fontSize: '0.78rem',
            color: '#64748b',
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
            Attribution &amp; Informations de source :
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div>
              <strong>Réseau Maroc (ONCF) :</strong> Données issues du jeu GTFS communautaire (
              <a
                href="https://github.com/orhazal/oncf-gtfs-unofficial"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                orhazal/oncf-gtfs-unofficial
              </a>
              , Licence ODbL 1.0) — horaires fournis à titre indicatif sans réservation transactionnelle directe.
              Pour toute réservation officielle, consultez{' '}
              <a
                href="https://www.oncf-voyages.ma"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                oncf-voyages.ma
              </a>
              .
            </div>
            <div>
              <strong>Réseau International :</strong> Planification d&apos;itinéraires ferroviaires et multimodaux propulsée par{' '}
              <a
                href="https://transitous.org"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#2563eb', textDecoration: 'underline' }}
              >
                Transitous
              </a>{' '}
              (moteur libre MOTIS, données OpenStreetMap / GTFS / NeTEx). Les tarifs ne sont pas fournis par cette source.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
