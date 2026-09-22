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
          className={`w-full h-10 pl-8 pr-8 rounded-lg border text-xs focus:outline-none focus:ring-2 focus:ring-[#02E0D5] focus:border-transparent transition-all ${
            error
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-100'
              : 'border-[#01796F]/40 bg-white dark:bg-[#021817] text-slate-900 dark:text-white'
          }`}
        />

        {/* Leading icon */}
        <i className={`${icon} absolute left-2.5 top-1/2 -translate-y-1/2 text-[#02E0D5] text-xs pointer-events-none`} />

        {/* Clear button */}
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
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

      {/* Autocomplete Dropdown Popup */}
      {isOpen && (
        <ul
          id={`${id}-listbox`}
          role="listbox"
          className="absolute top-[calc(100%+4px)] left-0 right-0 z-50 bg-white dark:bg-[#062523] border border-slate-200 dark:border-[#01796F]/40 rounded-xl shadow-2xl p-1.5 list-none m-0 max-h-[280px] overflow-y-auto"
        >
          {filteredSuggestions.length === 0 ? (
            <li className="p-3 text-center text-xs text-slate-500 dark:text-slate-400 italic">
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
                  className={`p-2 rounded-lg cursor-pointer flex items-center justify-between gap-2.5 transition-colors ${
                    isHighlighted
                      ? 'bg-[#01796F]/20 text-[#02E0D5]'
                      : 'hover:bg-slate-100 dark:hover:bg-[#0a302d] text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-semibold text-xs truncate">
                      {item.code ? `${item.code} — ` : ''}{item.title}
                    </div>
                    {item.subtitle && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    )}
                  </div>

                  {item.badge && (
                    <span className="text-[10px] font-bold bg-[#01796F]/15 text-[#01796F] dark:text-[#02E0D5] px-1.5 py-0.5 rounded tracking-wider shrink-0">
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
