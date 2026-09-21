'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { TrainStation } from '@/types/travel.types';
import { travelService } from '@/services/travel.service';

export interface StationSelectorProps {
  id: string;
  label: string;
  icon?: string;
  placeholder?: string;
  stations: TrainStation[];
  selectedStation: TrainStation | null;
  onSelect: (station: TrainStation | null) => void;
  error?: string | null;
  disabled?: boolean;
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const StationSelector: React.FC<StationSelectorProps> = ({
  id,
  label,
  icon = 'fas fa-train',
  placeholder = 'Rechercher une gare ou ville (ex: Casa, Paris, Lyon, Madrid)...',
  stations: initialStations,
  selectedStation,
  onSelect,
  error,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [remoteResults, setRemoteResults] = useState<TrainStation[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef('');

  useEffect(() => {
    if (selectedStation) {
      setQuery(selectedStation.name);
    } else {
      setQuery('');
    }
  }, [selectedStation]);

  const normalize = (s: string) => normalizeStr(s.trim());

  // Debounced remote search when query has >= 2 characters
  const fetchRemoteStations = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setRemoteResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const targetQuery = searchQuery.trim();
    latestQueryRef.current = targetQuery;

    try {
      const results = await travelService.getTrainStations(targetQuery);
      // Ensure we only update state for the latest query (race condition prevention)
      if (latestQueryRef.current === targetQuery) {
        setRemoteResults(results);
      }
    } catch {
      if (latestQueryRef.current === targetQuery) {
        setRemoteResults(null);
      }
    } finally {
      if (latestQueryRef.current === targetQuery) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (selectedStation && val !== selectedStation.name) {
      onSelect(null);
    }

    // Debounce 300ms
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchRemoteStations(val);
      }, 300);
    } else {
      setRemoteResults(null);
      setIsLoading(false);
    }
  };

  // Determine displayed stations
  const displayedStations = useMemo(() => {
    if (remoteResults !== null) {
      return remoteResults.slice(0, 15);
    }

    const q = normalize(query);
    if (!q) {
      return initialStations.slice(0, 10);
    }

    return initialStations
      .filter((s) => {
        const nameMatch = normalize(s.name).includes(q);
        const cityMatch = normalize(s.city || '').includes(q);
        const idMatch = s.id ? normalize(s.id).includes(q) : false;
        return nameMatch || cityMatch || idMatch;
      })
      .slice(0, 15);
  }, [remoteResults, initialStations, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [displayedStations]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedStation) {
          setQuery(selectedStation.name);
        } else {
          setQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [selectedStation]);

  const handleSelectStation = (station: TrainStation) => {
    onSelect(station);
    setQuery(station.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < displayedStations.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayedStations.length > 0 && highlightedIndex < displayedStations.length) {
        handleSelectStation(displayedStations[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const renderBadge = (station: TrainStation) => {
    const isOncf = station.provider === 'ONCF_GTFS' || station.countryCode === 'MA' || (!station.provider && station.country === 'Maroc');
    if (isOncf) {
      return (
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            background: '#e0e7ff',
            color: '#4338ca',
            padding: '2px 7px',
            borderRadius: '4px',
            letterSpacing: '0.02em',
          }}
        >
          ONCF
        </span>
      );
    }

    const label = station.countryCode || (station.country ? station.country.substring(0, 2).toUpperCase() : 'INTL');
    return (
      <span
        style={{
          fontSize: '0.7rem',
          fontWeight: 600,
          background: '#f1f5f9',
          color: '#0f766e',
          border: '1px solid #cbd5e1',
          padding: '2px 7px',
          borderRadius: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Transitous International"
      >
        <i className="fas fa-globe-europe" style={{ fontSize: '0.65rem' }} />
        {label}
      </span>
    );
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        flex: 1,
      }}
    >
      <label
        htmlFor={id}
        style={{
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#334155',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <i className={icon} style={{ color: '#2563eb' }} />
        {label}
      </label>

      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.65rem 2.2rem 0.65rem 2.2rem',
            border: `1.5px solid ${error ? '#ef4444' : '#cbd5e1'}`,
            borderRadius: '8px',
            fontSize: '0.95rem',
            background: disabled ? '#f1f5f9' : '#ffffff',
            color: '#1e293b',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        <i
          className={icon}
          style={{
            position: 'absolute',
            left: '0.75rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#94a3b8',
            fontSize: '0.9rem',
            pointerEvents: 'none',
          }}
        />
        {isLoading && (
          <i
            className="fas fa-spinner fa-spin"
            style={{
              position: 'absolute',
              right: selectedStation ? '2rem' : '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#3b82f6',
              fontSize: '0.85rem',
            }}
          />
        )}
        {selectedStation && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
              setRemoteResults(null);
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '0.65rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Effacer"
            aria-label="Effacer la sélection"
          >
            <i className="fas fa-times-circle" />
          </button>
        )}
      </div>

      {error && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{error}</span>}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: '4px',
            maxHeight: '270px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            listStyle: 'none',
            padding: '4px 0',
            margin: '4px 0 0 0',
          }}
        >
          {displayedStations.length === 0 ? (
            <li
              style={{
                padding: '0.75rem 1rem',
                fontSize: '0.875rem',
                color: '#64748b',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              {isLoading ? 'Recherche des gares...' : 'Aucune gare trouvée'}
            </li>
          ) : (
            displayedStations.map((station, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={station.id || `${station.name}-${station.countryCode || index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => handleSelectStation(station)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '0.65rem 1rem',
                    cursor: 'pointer',
                    background: isHighlighted ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                    gap: '8px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.9rem',
                        color: '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {station.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {station.city ? `${station.city}, ` : ''}{station.country || 'International'}
                    </div>
                  </div>
                  <div>{renderBadge(station)}</div>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
