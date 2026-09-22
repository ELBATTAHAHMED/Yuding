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
    const isMoroccan = station.provider === 'ONCF_GTFS' || station.countryCode === 'MA' || (!station.provider && station.country === 'Maroc');
    if (isMoroccan) {
      return (
        <span className="text-[10px] font-bold bg-[#01796F] text-white px-2 py-0.5 rounded tracking-wider shrink-0">
          ONCF
        </span>
      );
    }

    const label = station.countryCode || (station.country ? station.country.substring(0, 2).toUpperCase() : 'INTL');
    return (
      <span
        className="text-[10px] font-semibold bg-[#01796F]/15 text-[#01796F] dark:text-[#02E0D5] border border-[#01796F]/30 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0"
        title="Transitous International"
      >
        <i className="fas fa-globe-europe text-[9px]" />
        {label}
      </span>
    );
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <label
        htmlFor={id}
        className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
      >
        <i className={`${icon} mr-1.5 text-[#02E0D5]`} />
        {label}
      </label>

      <div className="relative flex items-center">
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
          className={`w-full h-10 pl-8 pr-8 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all ${
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
              : 'border-[#01796F]/40 bg-white dark:bg-[#021817] text-slate-900 dark:text-white'
          }`}
        />
        <i className={`${icon} absolute left-2.5 top-1/2 -translate-y-1/2 text-[#02E0D5] text-xs pointer-events-none`} />

        {isLoading && (
          <i className="fas fa-spinner fa-spin absolute right-8 top-1/2 -translate-y-1/2 text-[#02E0D5] text-xs" />
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
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs p-1 flex items-center justify-center transition-colors"
            title="Effacer"
            aria-label="Effacer la sélection"
          >
            <i className="fas fa-times-circle" />
          </button>
        )}
      </div>

      {error && <span className="block text-[11px] text-red-400 mt-1 text-left">{error}</span>}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-[#062523] border border-slate-200 dark:border-[#01796F]/40 rounded-xl shadow-2xl p-1.5 list-none m-0 max-h-[270px] overflow-y-auto"
        >
          {displayedStations.length === 0 ? (
            <li className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 italic">
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
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors ${
                    isHighlighted
                      ? 'bg-[#01796F]/20 text-[#02E0D5]'
                      : 'hover:bg-slate-100 dark:hover:bg-[#0a302d] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-semibold text-xs truncate">
                      {station.name}
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
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
