'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { geoService } from '@/services/geo.service';

export interface LocationSuggestion {
  code?: string;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
}

export interface TransferLocationSelectorProps {
  id: string;
  label: string;
  icon?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  suggestions: LocationSuggestion[];
  error?: string | null;
  disabled?: boolean;
}

function normalizeStr(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export const TransferLocationSelector: React.FC<TransferLocationSelectorProps> = ({
  id,
  label,
  icon = 'fas fa-map-marker-alt',
  placeholder = 'Rechercher un aéroport, ville ou adresse...',
  value,
  onChange,
  suggestions,
  error,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [geoSuggestions, setGeoSuggestions] = useState<LocationSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const normalize = (s: string) => normalizeStr(s.trim());

  // Debounced Geo place lookup
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setGeoSuggestions([]);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const places = await geoService.autocomplete({ text: q, limit: 5 });
        const mapped: LocationSuggestion[] = places.map((p) => ({
          title: p.city || p.name,
          subtitle: [p.state, p.country].filter(Boolean).join(', '),
          badge: p.type === 'city' ? 'VILLE' : 'LIEU',
          badgeColor: '#01796F',
        }));
        setGeoSuggestions(mapped);
      } catch {
        setGeoSuggestions([]);
      }
    }, 300);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [value]);

  // Combined suggestions: static airports / popular points first, followed by Geo places
  const filteredSuggestions = useMemo(() => {
    const q = normalize(value);
    if (!q) {
      return suggestions.slice(0, 10);
    }

    const staticMatches = suggestions.filter((item) => {
      const titleMatch = normalize(item.title).includes(q);
      const codeMatch = item.code ? normalize(item.code).includes(q) : false;
      const subMatch = item.subtitle ? normalize(item.subtitle).includes(q) : false;
      return titleMatch || codeMatch || subMatch;
    });

    // Merge static and geo suggestions without title duplicates
    const seenTitles = new Set(staticMatches.map((s) => s.title.toLowerCase()));
    const uniqueGeo = geoSuggestions.filter((g) => !seenTitles.has(g.title.toLowerCase()));

    return [...staticMatches, ...uniqueGeo].slice(0, 12);
  }, [suggestions, value, geoSuggestions]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredSuggestions]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (item: LocationSuggestion) => {
    const text = item.code ? `${item.code} — ${item.title}` : item.title;
    onChange(text);
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
      setHighlightedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      if (isOpen && filteredSuggestions.length > 0 && highlightedIndex < filteredSuggestions.length) {
        e.preventDefault();
        handleSelect(filteredSuggestions[highlightedIndex]);
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
          fontWeight: 700,
          color: '#01796F',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        <i className={icon} style={{ color: '#01796F' }} />
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
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          style={{
            width: '100%',
            padding: '0.75rem 2.4rem 0.75rem 2.4rem',
            border: `1.5px solid ${error ? '#ef4444' : '#cbd5e1'}`,
            borderRadius: '8px',
            fontSize: '0.95rem',
            background: disabled ? '#f1f5f9' : '#ffffff',
            color: '#1e293b',
            outline: 'none',
            boxSizing: 'border-box',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
          }}
        />

        {/* Leading icon */}
        <i
          className={icon}
          style={{
            position: 'absolute',
            left: '0.85rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#01796F',
            fontSize: '0.95rem',
            pointerEvents: 'none',
          }}
        />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '2px',
              fontSize: '0.95rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Effacer"
            aria-label="Effacer la sélection"
          >
            <i className="fas fa-times-circle" />
          </button>
        )}
      </div>

      {error && <span style={{ color: '#ef4444', fontSize: '0.75rem' }}>{error}</span>}

      {/* Autocomplete Dropdown Popup */}
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
            marginTop: '6px',
            maxHeight: '280px',
            overflowY: 'auto',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '10px',
            boxShadow: '0 12px 25px -4px rgba(0, 0, 0, 0.15)',
            listStyle: 'none',
            padding: '6px 0',
            margin: '0',
          }}
        >
          {filteredSuggestions.length === 0 ? (
            <li
              style={{
                padding: '0.85rem 1rem',
                fontSize: '0.85rem',
                color: '#64748b',
                fontStyle: 'italic',
                textAlign: 'center',
              }}
            >
              Vous pouvez saisir librement votre adresse ou hôtel
            </li>
          ) : (
            filteredSuggestions.map((item, index) => {
              const isHighlighted = index === highlightedIndex;
              return (
                <li
                  key={item.code || `${item.title}-${index}`}
                  role="option"
                  aria-selected={isHighlighted}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  style={{
                    padding: '0.7rem 1rem',
                    cursor: 'pointer',
                    background: isHighlighted ? '#f0fdfa' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: index === filteredSuggestions.length - 1 ? 'none' : '1px solid #f1f5f9',
                    gap: '10px',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '0.92rem',
                        color: isHighlighted ? '#01796F' : '#1e293b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.code ? `${item.code} — ` : ''}{item.title}
                    </div>
                    {item.subtitle && (
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '1px' }}>
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {item.badge && (
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        background: item.badgeColor || '#ccfbf1',
                        color: '#0f766e',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        letterSpacing: '0.03em',
                        flexShrink: 0,
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};
