'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { TrainStation } from '@/types/travel.types';

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
  placeholder = 'Rechercher une gare (ex: Casa-Voyageurs, Rabat-Agdal)...',
  stations,
  selectedStation,
  onSelect,
  error,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedStation) {
      setQuery(selectedStation.name);
    } else {
      setQuery('');
    }
  }, [selectedStation]);

  const normalize = (s: string) => normalizeStr(s.trim());

  const filteredStations = useMemo(() => {
    const q = normalize(query);
    if (!q) {
      return stations.slice(0, 10);
    }
    return stations
      .filter((s) => {
        const nameMatch = normalize(s.name).includes(q);
        const cityMatch = normalize(s.city).includes(q);
        const idMatch = s.id ? normalize(s.id).includes(q) : false;
        return nameMatch || cityMatch || idMatch;
      })
      .slice(0, 15);
  }, [stations, query]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredStations]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        // Reset query if nothing selected
        if (selectedStation) {
          setQuery(selectedStation.name);
        } else {
          setQuery('');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectedStation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    if (selectedStation && val !== selectedStation.name) {
      onSelect(null);
    }
  };

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
      setHighlightedIndex((prev) => (prev < filteredStations.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredStations.length > 0 && highlightedIndex < filteredStations.length) {
        handleSelectStation(filteredStations[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
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
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.65rem 0.8rem 0.65rem 2.2rem',
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
        {selectedStation && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery('');
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
          >
            <i className="fas fa-times-circle" />
          </button>
        )}
      </div>

      {error && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{error}</span>}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: '4px',
            maxHeight: '260px',
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
          {filteredStations.length === 0 ? (
            <li
              style={{
                padding: '0.6rem 1rem',
                fontSize: '0.875rem',
                color: '#64748b',
                fontStyle: 'italic',
              }}
            >
              Aucune gare trouvée
            </li>
          ) : (
            filteredStations.map((station, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={station.id || station.name}
                  onClick={() => handleSelectStation(station)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '0.6rem 1rem',
                    cursor: 'pointer',
                    background: isHighlighted ? '#eff6ff' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #f1f5f9',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>
                      {station.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {station.city}, {station.country}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      background: '#e0e7ff',
                      color: '#4338ca',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    ONCF
                  </span>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
