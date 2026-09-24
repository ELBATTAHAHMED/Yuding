'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GeoPlace } from '@/types/geo.types';
import { geoService } from '@/services/geo.service';

export interface GeoPlaceSelectorProps {
  id: string;
  label: string;
  icon?: string;
  placeholder?: string;
  type?: string; // e.g. 'city'
  countryFilter?: string; // e.g. 'ma'
  selectedPlace: GeoPlace | null;
  onSelect: (place: GeoPlace | null) => void;
  error?: string | null;
  disabled?: boolean;
  required?: boolean;
  onQueryChange?: (text: string) => void;
}

export const GeoPlaceSelector: React.FC<GeoPlaceSelectorProps> = ({
  id,
  label,
  icon = 'fas fa-map-marker-alt',
  placeholder = 'Rechercher une ville ou destination...',
  type = 'city',
  countryFilter,
  selectedPlace,
  onSelect,
  error,
  disabled = false,
  required = false,
  onQueryChange,
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestQueryRef = useRef('');
  const prevPlaceRef = useRef<GeoPlace | null>(selectedPlace);
  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;

  // Sync query display when selectedPlace changes externally
  useEffect(() => {
    if (selectedPlace !== prevPlaceRef.current) {
      prevPlaceRef.current = selectedPlace;
      if (selectedPlace) {
        const displayName = selectedPlace.city || selectedPlace.name;
        const countryStr = selectedPlace.country ? `, ${selectedPlace.country}` : '';
        setQuery(`${displayName}${countryStr}`);
        onQueryChangeRef.current?.(displayName);
      } else if (document.activeElement !== inputRef.current) {
        setQuery('');
        onQueryChangeRef.current?.('');
      }
    }
  }, [selectedPlace]);

  // Debounced search
  const fetchSuggestions = useCallback(
    async (text: string) => {
      if (!text || text.trim().length < 2) {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const targetQuery = text.trim();
      latestQueryRef.current = targetQuery;

      try {
        const results = await geoService.autocomplete({
          text: targetQuery,
          type: type || undefined,
          country: countryFilter || undefined,
          limit: 8,
        });

        if (latestQueryRef.current === targetQuery) {
          setSuggestions(results);
          setHighlightedIndex(0);
        }
      } catch {
        if (latestQueryRef.current === targetQuery) {
          setSuggestions([]);
        }
      } finally {
        if (latestQueryRef.current === targetQuery) {
          setIsLoading(false);
        }
      }
    },
    [type, countryFilter]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setIsOpen(true);
    onQueryChange?.(val);

    if (selectedPlace && val !== selectedPlace.name && val !== `${selectedPlace.city}, ${selectedPlace.country}`) {
      prevPlaceRef.current = null;
      onSelect(null);
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (val.trim().length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(val);
      }, 300);
    } else {
      setSuggestions([]);
      setIsLoading(false);
    }
  };

  const handleSelect = (place: GeoPlace) => {
    prevPlaceRef.current = place;
    onSelect(place);
    const displayName = place.city || place.name;
    const countryStr = place.country ? `, ${place.country}` : '';
    setQuery(`${displayName}${countryStr}`);
    onQueryChange?.(displayName);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    prevPlaceRef.current = null;
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onSelect(null);
    onQueryChange?.('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === 'ArrowDown' && query.trim().length >= 2) {
        setIsOpen(true);
        fetchSuggestions(query);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[highlightedIndex]) {
          handleSelect(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
      default:
        break;
    }
  };

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-bold text-[#02E0D5] mb-1 uppercase tracking-wider text-left"
        >
          {icon && <i className={`${icon} mr-1.5 text-[#02E0D5]`} />}
          {label}
          {required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative flex items-center">
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls={`${id}-suggestions`}
          aria-activedescendant={
            isOpen && suggestions[highlightedIndex] ? `${id}-opt-${highlightedIndex}` : undefined
          }
          autoComplete="off"
          value={query}
          placeholder={placeholder}
          disabled={disabled}
          onChange={handleInputChange}
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsOpen(true);
              if (suggestions.length === 0) {
                fetchSuggestions(query);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className={`w-full h-10 px-3 pr-8 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all ${
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
              : 'border-[#01796F]/40 bg-white dark:bg-[#021817] text-slate-900 dark:text-white'
          }`}
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-2.5 flex items-center text-slate-400">
          {isLoading ? (
            <i className="fas fa-spinner fa-spin text-xs text-[#02E0D5]" />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Effacer le lieu"
              className="bg-transparent text-[#01796F] hover:text-[#005f57] dark:text-[#02E0D5] dark:hover:text-white text-xs p-1 flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times-circle" />
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <span className="block text-[11px] text-red-400 mt-1 text-left">
          {error}
        </span>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 right-0 bg-white dark:bg-[#062523] border border-slate-200 dark:border-[#01796F]/40 rounded-xl shadow-2xl z-50 max-h-[260px] overflow-y-auto p-1.5 list-none m-0"
        >
          {suggestions.map((place, index) => {
            const isHighlighted = index === highlightedIndex;
            const regionContext = [place.state, place.country].filter(Boolean).join(', ');

            return (
              <li
                key={place.id || `${place.name}-${index}`}
                id={`${id}-opt-${index}`}
                role="option"
                aria-selected={isHighlighted}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => handleSelect(place)}
                className={`p-2 rounded-lg cursor-pointer flex items-center gap-2.5 transition-colors ${
                  isHighlighted
                    ? 'bg-[#01796F]/20 text-[#02E0D5]'
                    : 'hover:bg-slate-100 dark:hover:bg-[#0a302d] text-slate-800 dark:text-slate-200'
                }`}
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 ${
                  isHighlighted ? 'bg-[#01796F] text-white' : 'bg-[#01796F]/15 text-[#01796F] dark:text-[#02E0D5]'
                }`}>
                  <i className={place.type === 'city' ? 'fas fa-city' : 'fas fa-map-pin'} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-semibold text-xs truncate">
                    {place.city || place.name}
                  </div>
                  {regionContext && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {regionContext}
                    </div>
                  )}
                </div>
                {place.countryCode && (
                  <span className="text-[10px] font-bold bg-[#01796F]/15 text-[#01796F] dark:text-[#02E0D5] px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                    {place.countryCode}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* No results message */}
      {isOpen && !isLoading && query.trim().length >= 2 && suggestions.length === 0 && (
        <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-[#062523] border border-slate-200 dark:border-[#01796F]/40 rounded-xl shadow-2xl p-3 text-center text-xs text-slate-500 dark:text-slate-400">
          <i className="fas fa-search mr-1.5 text-slate-400" />
          Aucun lieu trouvé pour « {query} »
        </div>
      )}
    </div>
  );
};
