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
    <div ref={containerRef} className="airport-selector-wrapper relative w-full">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
      >
        <i className={`fas ${icon} mr-1.5 text-[#02E0D5]`} />
        {label}
      </label>

      <div className="relative flex items-center">
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
          className={`w-full h-10 px-3 pr-8 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all ${
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
              : 'border-[#01796F]/40 bg-white dark:bg-[#021817] text-slate-900 dark:text-white'
          }`}
        />

        {/* Clear button */}
        {selectedAirport && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Effacer la sélection"
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent text-[#01796F] hover:text-[#005f57] dark:text-[#02E0D5] dark:hover:text-white text-xs p-1 flex items-center justify-center transition-colors"
          >
            <i className="fas fa-times-circle" />
          </button>
        )}
      </div>

      {error && (
        <span className="block text-[11px] text-red-400 mt-1 text-left">
          {error}
        </span>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-[#062523] border border-slate-200 dark:border-[#01796F]/40 rounded-xl shadow-2xl z-50 max-h-[280px] overflow-y-auto p-1.5"
        >
          {filteredAirports.length === 0 ? (
            <div className="p-3 text-center text-slate-500 dark:text-slate-400 text-xs">
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
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                    isHighlighted
                      ? 'bg-[#01796F]/20 text-[#02E0D5]'
                      : isSelected
                      ? 'bg-[#01796F]/10 text-slate-900 dark:text-white'
                      : 'hover:bg-slate-100 dark:hover:bg-[#0a302d] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 bg-[#01796F] text-white font-bold text-[11px] rounded tracking-wide shrink-0">
                      {airport.code}
                    </span>
                    <div className="min-w-0 text-left">
                      <div className="font-semibold text-xs truncate">
                        {airport.city} — {airport.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {airport.country}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <i className="fas fa-check text-[#02E0D5] text-xs shrink-0" />
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
