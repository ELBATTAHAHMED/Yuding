'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { geoService } from '@/services/geo.service';
import type { GeoPlace, NearbyPlace } from '@/types/geo.types';

type TomTomMapInstance = import('@tomtom-org/maps-sdk/map').TomTomMap;
type TomTomMarker = import('maplibre-gl').Marker;
type MapSearchResult =
  | { kind: 'poi'; id: string; name: string; latitude: number; longitude: number; poi: NearbyPlace }
  | { kind: 'place'; id: string; name: string; latitude: number; longitude: number; place: GeoPlace };
type SearchedLocation = { name: string; latitude: number; longitude: number };

export interface GeoMapProps {
  latitude: number;
  longitude: number;
  placeName?: string;
  pois?: NearbyPlace[];
  selectedPoi?: NearbyPlace | null;
  onSelectPoi?: (poi: NearbyPlace) => void;
  height?: number;
  width?: number;
}

const TOMTOM_API_KEY = process.env.NEXT_PUBLIC_TOMTOM_API_KEY ?? '';
const TOMTOM_LANGUAGE = (process.env.NEXT_PUBLIC_TOMTOM_LANGUAGE ?? 'fr-FR') as import('@tomtom-org/maps-sdk/core').Language;
const POI_FOCUS_ZOOM = 17;

function isDarkTheme() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark')
    || document.documentElement.dataset.theme === 'dark'
    || document.body.dataset.theme === 'dark';
}

export const GeoMap: React.FC<GeoMapProps> = ({
  latitude,
  longitude,
  placeName,
  selectedPoi,
  pois = [],
  onSelectPoi,
  height = 360,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<TomTomMapInstance | null>(null);
  const mapLibreRef = useRef<typeof import('maplibre-gl') | null>(null);
  const markersRef = useRef<TomTomMarker[]>([]);
  const poisRef = useRef<NearbyPlace[]>(pois);
  const selectedPoiRef = useRef<NearbyPlace | null | undefined>(selectedPoi);
  const onSelectPoiRef = useRef(onSelectPoi);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [remoteSearchResults, setRemoteSearchResults] = useState<GeoPlace[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchedLocation, setSearchedLocation] = useState<SearchedLocation | null>(null);

  selectedPoiRef.current = selectedPoi;
  onSelectPoiRef.current = onSelectPoi;
  poisRef.current = pois;

  const searchResults = useMemo<MapSearchResult[]>(() => {
    const query = searchText.trim().toLocaleLowerCase();
    if (!query) return [];
    const localResults = pois
      .filter((poi) => `${poi.name} ${poi.formattedAddress ?? ''}`.toLocaleLowerCase().includes(query))
      .slice(0, 5)
      .map((poi) => ({ kind: 'poi' as const, id: `poi-${poi.id}`, name: poi.name, latitude: poi.latitude, longitude: poi.longitude, poi }));
    const localNames = new Set(localResults.map((result) => result.name.toLocaleLowerCase()));
    const remoteResults = remoteSearchResults
      .filter((place) => !localNames.has(place.name.toLocaleLowerCase()))
      .slice(0, 5)
      .map((place) => ({ kind: 'place' as const, id: `place-${place.id}`, name: place.name, latitude: place.latitude, longitude: place.longitude, place }));
    return [...localResults, ...remoteResults].slice(0, 6);
  }, [pois, remoteSearchResults, searchText]);

  useEffect(() => {
    const query = searchText.trim();
    if (query.length < 2) {
      setRemoteSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      const results = await geoService.autocomplete({
        text: query,
        // Geoapify expects an ISO-639-1 language ("fr"), while the map SDK
        // uses the regional form ("fr-FR").
        language: TOMTOM_LANGUAGE.split('-')[0],
        country: 'MA',
        limit: 5,
        biasLat: latitude,
        biasLon: longitude,
      });
      if (!cancelled) {
        setRemoteSearchResults(results);
        setSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [latitude, longitude, searchText]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let disposed = false;
    let themeObserver: MutationObserver | null = null;

    const createMap = async () => {
      if (!TOMTOM_API_KEY) {
        setMapError('Clé TomTom absente. Ajoutez NEXT_PUBLIC_TOMTOM_API_KEY dans frontend/web/.env.local.');
        return;
      }

      try {
        const [{ TomTomConfig }, { TomTomMap, StylingFoundationsModule }, mapLibre] = await Promise.all([
          import('@tomtom-org/maps-sdk/core'),
          import('@tomtom-org/maps-sdk/map'),
          import('maplibre-gl'),
        ]);

        if (disposed) return;

        // Next's webpack bundle does not emit MapLibre's worker beside the map
        // bundle. Serve the official worker from public/ instead.
        // Version the URL so browsers do not reuse an older cached worker.
        mapLibre.setWorkerUrl('/maplibre-gl-worker.mjs?v=2');

        TomTomConfig.instance.put({
          apiKey: TOMTOM_API_KEY,
          language: TOMTOM_LANGUAGE,
          geopoliticalView: 'MA',
        });

        const map = new TomTomMap({
          // monoDark avoids optional traffic/hillshade entitlements while
          // retaining the full vector basemap in dark mode.
          style: isDarkTheme() ? 'monoDark' : 'streetLight',
          attribution: { position: 'bottom-right', padding: { horizontal: 12, vertical: 8 } },
          registerMapLibreWorker: false,
          transformRequest: (request, resourceType) => {
            if (resourceType !== 'Glyphs') return request;
            // Some Orbis style revisions still point at the removed Open Sans
            // glyph path. The SDK's supported face is Noto-Regular.
            const fixedUrl = request.url.replace(
              /\/Open(?:%20|\s)Sans(?:%20|\s)Regular(?:(?:,|%2C)Open(?:%20|\s)Sans(?:%20|\s)Regular)*\//,
              '/Noto-Regular/',
            );
            return fixedUrl === request.url ? request : { ...request, url: fixedUrl };
          },
          mapLibre: {
            container: element,
            center: [longitude, latitude],
            zoom: 11,
            maxZoom: 20,
            minZoom: 3,
            // TomTom's hosted style contains legacy nullable filter values.
            // The style is provider-owned and valid at runtime, so skip
            // MapLibre's noisy development validator for it.
            validateStyle: false,
            pitchWithRotate: false,
            dragRotate: false,
            touchPitch: false,
          },
        });

        // Use the Noto faces shipped by the TomTom style instead of the
        // legacy Open Sans glyph URL that returns 404 in this style version.
        try {
          await StylingFoundationsModule.get(map, { labels: { typeface: 'sans' } });
        } catch (error) {
          console.warn('TomTom typeface setup failed; keeping the default style', error);
        }

        map.mapLibreMap.addControl(new mapLibre.NavigationControl({ showCompass: true, visualizePitch: false }), 'top-right');
        mapRef.current = map;
        mapLibreRef.current = mapLibre;
        // TomTom can finish the initial style load before the listener below
        // is attached. Mark the instance ready immediately; markers are safe
        // to add before the first frame and will then follow the map camera.
        setMapReady(true);

        map.mapLibreMap.once('load', () => {
          if (disposed) return;
          setMapReady(true);
        });

        themeObserver = new MutationObserver(() => {
          if (!mapRef.current?.mapReady) return;
          void mapRef.current.setStyle(isDarkTheme() ? 'monoDark' : 'streetLight');
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
      } catch (error) {
        console.error('TomTom map initialization failed', error);
        if (!disposed) setMapError('La carte TomTom ne peut pas être chargée. Vérifiez la clé et la connexion.');
      }
    };

    void createMap();

    return () => {
      disposed = true;
      themeObserver?.disconnect();
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      mapRef.current?.mapLibreMap.remove();
      mapRef.current = null;
      mapLibreRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    map.mapLibreMap.resize();
  }, [height]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => mapRef.current?.mapLibreMap.resize());
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    setSearchedLocation(null);
    map.mapLibreMap.flyTo({ center: [longitude, latitude], zoom: 11, duration: 700, essential: true });
  }, [latitude, longitude]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedPoi) return;
    map.mapLibreMap.flyTo({
      center: [selectedPoi.longitude, selectedPoi.latitude],
      zoom: POI_FOCUS_ZOOM,
      duration: 850,
      essential: true,
    });
  }, [selectedPoi?.id, selectedPoi?.latitude, selectedPoi?.longitude]);

  useEffect(() => {
    const map = mapRef.current;
    const MapLibre = mapLibreRef.current;
    if (!map || !MapLibre || !mapReady) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const makeSelectedMarkerElement = (label: string) => {
      const wrapper = document.createElement('span');
      wrapper.className = 'geo-map-sdk-marker-wrapper geo-map-sdk-marker--selected';
      wrapper.style.position = 'relative';
      wrapper.style.display = 'block';
      wrapper.style.width = '38px';
      wrapper.style.height = '48px';
      wrapper.style.pointerEvents = 'auto';

      const pin = document.createElement('span');
      pin.setAttribute('role', 'img');
      pin.setAttribute('aria-label', label);
      pin.title = label;
      pin.style.position = 'absolute';
      pin.style.top = '2px';
      pin.style.left = '3px';
      pin.style.width = '32px';
      pin.style.height = '32px';
      pin.style.border = '3px solid #fff';
      pin.style.borderRadius = '50% 50% 50% 0';
      pin.style.background = '#12a893';
      pin.style.boxShadow = '0 3px 9px rgba(0,0,0,.42)';
      pin.style.transform = 'rotate(-45deg)';
      pin.style.display = 'grid';
      pin.style.placeItems = 'center';

      const dot = document.createElement('span');
      dot.setAttribute('aria-hidden', 'true');
      dot.style.width = '9px';
      dot.style.height = '9px';
      dot.style.borderRadius = '50%';
      dot.style.background = '#fff';
      dot.style.transform = 'rotate(45deg)';
      pin.appendChild(dot);
      wrapper.appendChild(pin);
      return wrapper;
    };

    const selectedLocation = searchedLocation ?? (selectedPoi ? {
      name: selectedPoi.name,
      latitude: selectedPoi.latitude,
      longitude: selectedPoi.longitude,
    } : null);

    if (selectedLocation) {
      const marker = new MapLibre.Marker({
        element: makeSelectedMarkerElement(selectedLocation.name),
        anchor: 'bottom',
      }).setLngLat([selectedLocation.longitude, selectedLocation.latitude]).addTo(map.mapLibreMap);
      markersRef.current.push(marker);
    }
  }, [mapReady, searchedLocation, selectedPoi?.id, selectedPoi?.latitude, selectedPoi?.longitude]);
  const focusPoi = useCallback((poi: NearbyPlace) => {
    setSearchedLocation(null);
    onSelectPoi?.(poi);
    mapRef.current?.mapLibreMap.flyTo({ center: [poi.longitude, poi.latitude], zoom: POI_FOCUS_ZOOM, duration: 850, essential: true });
    setSearchText(poi.name);
    setSearchOpen(false);
  }, [onSelectPoi]);

  const focusSearchResult = useCallback((result: MapSearchResult) => {
    if (result.kind === 'poi') {
      focusPoi(result.poi);
      return;
    }
    setSearchedLocation({ name: result.name, latitude: result.latitude, longitude: result.longitude });
    mapRef.current?.mapLibreMap.flyTo({ center: [result.longitude, result.latitude], zoom: POI_FOCUS_ZOOM, duration: 850, essential: true });
    setSearchText(result.name);
    setSearchOpen(false);
  }, [focusPoi]);

  return (
    <div
      ref={containerRef}
      className="geo-map geo-map--tomtom-sdk"
      style={{ position: 'relative', width: '100%', height, borderRadius: 12, overflow: 'hidden', border: '1px solid #d7e4df', background: '#e9f0ed' }}
    >
      <div data-map-control style={{ position: 'absolute', top: 12, left: 12, zIndex: 20, width: 'min(240px, calc(100% - 78px))' }}>
        <input
          type="search"
          className="geo-map-search"
          aria-label="Rechercher un lieu sur la carte"
          placeholder="Rechercher un lieu"
          value={searchText}
          onChange={(event) => { setSearchText(event.target.value); setSearchOpen(true); }}
          onFocus={() => setSearchOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setSearchOpen(false);
            if (event.key === 'Enter' && searchResults[0]) focusSearchResult(searchResults[0]);
          }}
          style={{ width: '100%', height: 36, border: '1px solid #d7e4df', borderRadius: 8, background: '#fff', boxShadow: '0 2px 7px rgba(0,0,0,.13)', color: '#214c46', padding: '0 10px', fontSize: 12 }}
        />
        {searchOpen && (searchResults.length > 0 || searchLoading) && (
          <div className="geo-map-search-results" style={{ background: '#fff', border: '1px solid #d7e4df', borderRadius: 8, boxShadow: '0 5px 16px rgba(0,0,0,.16)', marginTop: 4, overflow: 'hidden' }}>
            {searchLoading && searchResults.length === 0 && <div style={{ padding: '9px 10px', color: '#648079', fontSize: 12 }}>Recherche…</div>}
            {searchResults.map((result) => (
              <button key={result.id} type="button" onClick={() => focusSearchResult(result)} style={{ display: 'block', width: '100%', border: 0, borderBottom: '1px solid #eaf0ed', background: '#fff', color: '#214c46', padding: '9px 10px', textAlign: 'left', fontSize: 12, cursor: 'pointer' }}>{result.name}</button>
            ))}
          </div>
        )}
      </div>

      {mapError && (
        <div className="geo-map-error" role="status" style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(250,250,250,.94)', color: '#777', padding: '1rem', textAlign: 'center' }}>
          <strong>Carte indisponible</strong>
          <span style={{ fontSize: 12 }}>{mapError}</span>
        </div>
      )}
    </div>
  );
};
