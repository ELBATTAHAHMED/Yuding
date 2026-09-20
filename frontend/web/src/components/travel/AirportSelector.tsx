'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { Airport } from '@/types/travel.types';

export interface AirportSelectorProps {
  id: string;
  label: string;
  icon: string;
  placeholder?: string;
  airports: Airport[];
  selectedAirport: Airport | null;
  onSelect: (airport: Airport | null) => void;
  error?: string | null;
  disabled?: boolean;
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const AirportSelector: React.FC<AirportSelectorProps> = ({
  id,
  label,
  icon,
  placeholder = 'Rechercher ville ou aéroport...',
  airports,
  selectedAirport,
  onSelect,
  error,
  disabled = false,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display text when selectedAirport changes externally
  useEffect(() => {
    if (selectedAirport) {
      setQuery(`${selectedAirport.city} (${selectedAirport.code})`);
    } else {
      setQuery('');
    }
  }, [selectedAirport]);

  // Normalize string for accent-insensitive and case-insensitive comparison
  const normalize = (s: string) => normalizeStr(s.trim());

  // Helper to find exact or best matching airport from string query
  const findMatchingAirport = (text: string): Airport | null => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const q = normalize(trimmed);

    // 1. Exact IATA code match (e.g. "CMN", "CDG", "rak")
    const iataMatch = airports.find((a) => a.code.toLowerCase() === trimmed.toLowerCase());
    if (iataMatch) return iataMatch;

    // 2. String containing code in parentheses, e.g. "Casablanca (CMN)"
    const parenMatch = trimmed.match(/\(([A-Z]{3})\)/i);
    if (parenMatch) {
      const codeAirport = airports.find((a) => a.code.toUpperCase() === parenMatch[1].toUpperCase());
      if (codeAirport) return codeAirport;
    }

    // 3. Exact city match (e.g. "Casablanca", "Paris", "Marrakech")
    const exactCity = airports.find((a) => normalize(a.city) === q);
    if (exactCity) return exactCity;

    // 4. Exact name match
    const exactName = airports.find((a) => normalize(a.name) === q);
    if (exactName) return exactName;

    // 5. City starts with query
    const cityStarts = airports.find((a) => normalize(a.city).startsWith(q));
    if (cityStarts) return cityStarts;

    // 6. Any field contains query
    const anyContains = airports.find(
      (a) =>
        normalize(a.code).includes(q) ||
        normalize(a.city).includes(q) ||
        normalize(a.name).includes(q)
    );
    if (anyContains) return anyContains;

    return null;
  };

  // Filter airports by query (code, name, city, country) with prioritized sorting
  const filteredAirports = useMemo(() => {
    if (!query.trim()) {
      return airports.slice(0, 8);
    }
    const q = normalize(query);
    return airports
      .filter((a) => {
        const code = normalize(a.code);
        const name = normalize(a.name);
        const city = normalize(a.city);
        const country = normalize(a.country);
        return (
          code.includes(q) ||
          name.includes(q) ||
          city.includes(q) ||
          country.includes(q)
        );
      })
      .sort((a, b) => {
        // Exact IATA match first
        if (a.code.toLowerCase() === q) return -1;
        if (b.code.toLowerCase() === q) return 1;
        // City exact match second
        if (normalize(a.city) === q) return -1;
        if (normalize(b.city) === q) return 1;
        // City starts with query third
        const aStarts = normalize(a.city).startsWith(q);
        const bStarts = normalize(b.city).startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      })
      .slice(0, 8);
  }, [airports, query]);

  // Reset highlight index when filter results change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredAirports]);

  // Commit selection when focus leaves or dropdown closes
  const commitSelection = () => {
    setIsOpen(false);
    const trimmed = query.trim();
    if (!trimmed) {
      onSelect(null);
      setQuery('');
      return;
    }

    // Try to resolve to an airport
    const match = findMatchingAirport(trimmed) || (filteredAirports.length > 0 ? filteredAirports[0] : null);
    if (match) {
      onSelect(match);
      setQuery(`${match.city} (${match.code})`);
    } else if (selectedAirport) {
      // Revert to previously valid airport
      setQuery(`${selectedAirport.city} (${selectedAirport.code})`);
    } else {
      setQuery('');
      onSelect(null);
    }
  };

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        commitSelection();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [containerRef, query, filteredAirports, selectedAirport, airports]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);

    if (!val.trim()) {
      onSelect(null);
      return;
    }

    // If user typed exact 3-letter IATA code or exact city name, eagerly select
    const match = findMatchingAirport(val);
    if (match && (val.trim().length === 3 || normalize(match.city) === normalize(val))) {
      onSelect(match);
    }
  };

  const handleSelectAirport = (airport: Airport) => {
    onSelect(airport);
    setQuery(`${airport.city} (${airport.code})`);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredAirports.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredAirports.length - 1
        );
        break;
      case 'Enter':
      case 'Tab':
        if (filteredAirports[highlightedIndex]) {
          e.preventDefault();
          handleSelectAirport(filteredAirports[highlightedIndex]);
        } else {
          commitSelection();
        }
        break;
      case 'Escape':
        setIsOpen(false);
        commitSelection();
        break;
    }
  };

  return (
    <div ref={containerRef} className="airport-selector-wrapper" style={{ position: 'relative', width: '100%' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontWeight: 600,
          marginBottom: '0.4rem',
          textAlign: 'left',
          fontSize: '0.9rem',
          color: 'var(--text, #001b1a)',
        }}
      >
        <i className={`fas ${icon}`} style={{ marginRight: '0.4rem', color: '#01796F' }} />
        {label}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          ref={inputRef}
          type="text"
          id={id}
          autoComplete="off"
          disabled={disabled}
          placeholder={placeholder}
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-listbox`}
          style={{
            width: '100%',
            padding: '0.75rem 2.2rem 0.75rem 0.75rem',
            borderRadius: '6px',
            border: error ? '2px solid #e53935' : '1px solid #ccc',
            boxSizing: 'border-box',
            fontSize: '0.95rem',
            color: '#111',
            backgroundColor: '#fff',
            outline: 'none',
          }}
        />

        {/* Clear button */}
        {selectedAirport && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la sélection"
            style={{
              position: 'absolute',
              right: '0.6rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#888',
              fontSize: '1rem',
              padding: '0.2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <i className="fas fa-times-circle" />
          </button>
        )}
      </div>

      {error && (
        <span style={{ color: '#e53935', fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>
          {error}
        </span>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: '#ffffff',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            border: '1px solid #e0e0e0',
            zIndex: 1000,
            maxHeight: '280px',
            overflowY: 'auto',
          }}
        >
          {filteredAirports.length === 0 ? (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#777', fontSize: '0.88rem' }}>
              Aucun aéroport trouvé pour &quot;{query}&quot;
            </div>
          ) : (
            filteredAirports.map((airport, index) => {
              const isSelected = selectedAirport?.code === airport.code;
              const isHighlighted = index === highlightedIndex;

              return (
                <div
                  key={airport.code}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => handleSelectAirport(airport)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    backgroundColor: isHighlighted ? '#e0f2f1' : isSelected ? '#f5f5f5' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <span
                      style={{
                        padding: '0.2rem 0.45rem',
                        backgroundColor: '#01796F',
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        letterSpacing: '0.5px',
                        flexShrink: 0,
                      }}
                    >
                      {airport.code}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {airport.city} — {airport.name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#666' }}>
                        {airport.country}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <i className="fas fa-check" style={{ color: '#01796F', fontSize: '0.85rem', flexShrink: 0 }} />
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
