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

  // Sync query display when selectedPlace changes
  useEffect(() => {
    if (selectedPlace) {
      const displayName = selectedPlace.city || selectedPlace.name;
      const countryStr = selectedPlace.country ? `, ${selectedPlace.country}` : '';
      setQuery(`${displayName}${countryStr}`);
    } else {
      setQuery('');
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

    if (selectedPlace && val !== selectedPlace.name && val !== `${selectedPlace.city}, ${selectedPlace.country}`) {
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
    onSelect(place);
    const displayName = place.city || place.name;
    const countryStr = place.country ? `, ${place.country}` : '';
    setQuery(`${displayName}${countryStr}`);
    setIsOpen(false);
    setSuggestions([]);
    inputRef.current?.blur();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuery('');
    setSuggestions([]);
    setIsOpen(false);
    onSelect(null);
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
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#01796F',
            marginBottom: '0.35rem',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {icon && <i className={icon} style={{ fontSize: '0.85rem' }} />}
          {label}
          {required && <span style={{ color: '#e53935' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
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
          style={{
            width: '100%',
            padding: '0.75rem 2.2rem 0.75rem 1rem',
            borderRadius: '8px',
            border: error ? '1.5px solid #e53935' : '1px solid #ccc',
            fontSize: '0.95rem',
            outline: 'none',
            background: disabled ? '#f5f5f5' : '#fff',
            color: '#222',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
        />

        {/* Loading Spinner or Clear Button */}
        <div
          style={{
            position: 'absolute',
            right: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            color: '#888',
          }}
        >
          {isLoading ? (
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '0.85rem', color: '#01796F' }} />
          ) : query ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Effacer le lieu"
              style={{
                background: 'none',
                border: 'none',
                padding: '0.2rem',
                cursor: 'pointer',
                color: '#999',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <i className="fas fa-times-circle" style={{ fontSize: '0.9rem' }} />
            </button>
          ) : null}
        </div>
      </div>

      {error && (
        <span style={{ display: 'block', fontSize: '0.78rem', color: '#e53935', marginTop: '0.25rem' }}>
          {error}
        </span>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <ul
          id={`${id}-suggestions`}
          role="listbox"
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            maxHeight: '260px',
            overflowY: 'auto',
            margin: 0,
            padding: '0.25rem 0',
            listStyle: 'none',
          }}
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
                style={{
                  padding: '0.65rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  background: isHighlighted ? '#e0f2f1' : 'transparent',
                  borderBottom: index < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                  transition: 'background 0.15s',
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: isHighlighted ? '#01796F' : '#f0f4f4',
                    color: isHighlighted ? '#fff' : '#01796F',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.85rem',
                    flexShrink: 0,
                  }}
                >
                  <i className={place.type === 'city' ? 'fas fa-city' : 'fas fa-map-pin'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#222',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {place.city || place.name}
                  </div>
                  {regionContext && (
                    <div
                      style={{
                        fontSize: '0.8rem',
                        color: '#666',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {regionContext}
                    </div>
                  )}
                </div>
                {place.countryCode && (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: '#e8f5e9',
                      color: '#2e7d32',
                      padding: '0.15rem 0.4rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                    }}
                  >
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
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            zIndex: 999,
            background: '#fff',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            padding: '1rem',
            textAlign: 'center',
            fontSize: '0.85rem',
            color: '#777',
          }}
        >
          <i className="fas fa-search" style={{ marginRight: '0.4rem', color: '#aaa' }} />
          Aucun lieu trouvé pour « {query} »
        </div>
      )}
    </div>
  );
};
