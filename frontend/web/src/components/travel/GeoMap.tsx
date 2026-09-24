'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { NearbyPlace } from '@/types/geo.types';
import { geoService } from '@/services/geo.service';

function mapPixels(latitude: number, longitude: number, zoom: number) {
  const lat = Math.max(-85.0511, Math.min(85.0511, latitude)) * Math.PI / 180;
  const size = 256 * 2 ** zoom;
  return {
    x: (longitude + 180) / 360 * size,
    y: (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * size,
  };
}

function mapCoordinates(x: number, y: number, zoom: number) {
  const size = 256 * 2 ** zoom;
  return {
    latitude: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI,
    longitude: x / size * 360 - 180,
  };
}

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

export const GeoMap: React.FC<GeoMapProps> = ({
  latitude,
  longitude,
  placeName,
  selectedPoi,
  pois = [],
  onSelectPoi,
  height = 360,
  width = 640,
}) => {
  const [zoom, setZoom] = useState(11);
  const [requestedZoom, setRequestedZoom] = useState(11);
  const [center, setCenter] = useState({ latitude, longitude });
  const [displayedMap, setDisplayedMap] = useState<{ url: string; destinationKey: string; zoom: number; latitude: number; longitude: number } | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [viewportWidth, setViewportWidth] = useState(width);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [searchText, setSearchText] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const zoomRef = useRef(zoom);
  const wheelDistanceRef = useRef(0);
  zoomRef.current = zoom;

  useEffect(() => {
    setCenter({ latitude, longitude });
    setZoom(11);
    setRequestedZoom(11);
  }, [latitude, longitude]);

  useEffect(() => {
    if (!selectedPoi) return;
    setCenter({ latitude: selectedPoi.latitude, longitude: selectedPoi.longitude });
    setZoom((current) => Math.max(current, 15));
  }, [selectedPoi?.id, selectedPoi?.latitude, selectedPoi?.longitude]);

  // The destination marker stays in the image while the selected place is drawn above it.
  const markersParam = useMemo(() => {
    return `lonlat:${longitude},${latitude}`;
  }, [latitude, longitude]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewportWidth(element.clientWidth));
    observer.observe(element);
    setViewportWidth(element.clientWidth);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setRequestedZoom(zoom), 180);
    return () => window.clearTimeout(timer);
  }, [zoom]);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? height : 1);
      if ((delta < 0 && zoomRef.current >= 18) || (delta > 0 && zoomRef.current <= 3)) return;
      event.preventDefault();
      wheelDistanceRef.current += delta;
      const threshold = event.ctrlKey ? 18 : 75;
      if (Math.abs(wheelDistanceRef.current) < threshold) return;
      const step = wheelDistanceRef.current < 0 ? 1 : -1;
      wheelDistanceRef.current = 0;
      setZoom((current) => Math.max(3, Math.min(18, current + step)));
    };
    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [height]);

  // Generate backend-proxied map URL (zero client API key)
  const mapUrl = useMemo(() => {
    return geoService.getStaticMapUrl({
      lat: center.latitude,
      lon: center.longitude,
      zoom: requestedZoom,
      width: Math.min(width, 1000),
      height: Math.min(height, 800),
      markers: markersParam,
    });
  }, [center.latitude, center.longitude, requestedZoom, width, height, markersParam]);

  const destinationKey = `${latitude}:${longitude}`;
  const previousMap = displayedMap?.destinationKey === destinationKey ? displayedMap : null;
  const imgLoaded = previousMap?.url === mapUrl;
  const imgError = failedUrl === mapUrl;
  const previewScale = previousMap ? Math.min(2, Math.max(0.7, Math.pow(2, zoom - previousMap.zoom))) : 1;
  const imageScale = Math.max(viewportWidth / Math.min(width, 1000), height / Math.min(height, 800));
  const previewTranslation = previousMap ? (() => {
    const previous = mapPixels(previousMap.latitude, previousMap.longitude, previousMap.zoom);
    const next = mapPixels(center.latitude, center.longitude, previousMap.zoom);
    return { x: (previous.x - next.x) * imageScale * previewScale, y: (previous.y - next.y) * imageScale * previewScale };
  })() : { x: 0, y: 0 };
  const selectedPosition = useMemo(() => {
    if (!selectedPoi) return null;
    const imageZoom = previousMap?.zoom ?? requestedZoom;
    const imageCenter = mapPixels(previousMap?.latitude ?? center.latitude, previousMap?.longitude ?? center.longitude, imageZoom);
    const point = mapPixels(selectedPoi.latitude, selectedPoi.longitude, imageZoom);
    const scale = imageScale * previewScale;
    return {
      x: viewportWidth / 2 + (point.x - imageCenter.x) * scale + previewTranslation.x + dragOffset.x,
      y: height / 2 + (point.y - imageCenter.y) * scale + previewTranslation.y + dragOffset.y,
    };
  }, [selectedPoi, previousMap, requestedZoom, center.latitude, center.longitude, viewportWidth, height, imageScale, previewScale, previewTranslation.x, previewTranslation.y, dragOffset.x, dragOffset.y]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 1, 3));
  };

  const searchResults = searchText.trim()
    ? pois.filter((poi) => `${poi.name} ${poi.formattedAddress ?? ''}`.toLocaleLowerCase().includes(searchText.trim().toLocaleLowerCase())).slice(0, 5)
    : [];

  const finishDrag = (pointerId: number) => {
    if (!dragRef.current || dragRef.current.pointerId !== pointerId) return;
    dragRef.current = null;
    if (Math.abs(dragOffset.x) + Math.abs(dragOffset.y) > 3) {
      const pixels = mapPixels(center.latitude, center.longitude, zoom);
      const moved = mapCoordinates(pixels.x - dragOffset.x / imageScale, pixels.y - dragOffset.y / imageScale, zoom);
      setCenter(moved);
    }
    setDragOffset({ x: 0, y: 0 });
  };

  return (
    <div
      ref={mapRef}
      onPointerDown={(event) => {
        if (event.target instanceof Element && event.target.closest('button, input, a, [data-map-control]')) return;
        dragRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
        setDragOffset({ x: event.clientX - dragRef.current.x, y: event.clientY - dragRef.current.y });
      }}
      onPointerUp={(event) => finishDrag(event.pointerId)}
      onPointerCancel={(event) => finishDrag(event.pointerId)}
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
        background: '#e9f0ed',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
        cursor: dragRef.current ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
    >
      {/* Keep the last map visible while the next zoom or nearby point loads. */}
      {previousMap && previousMap.url !== mapUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previousMap.url}
          alt=""
          aria-hidden="true"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', transform: `translate(${previewTranslation.x + dragOffset.x}px, ${previewTranslation.y + dragOffset.y}px) scale(${previewScale})`, transition: dragRef.current ? 'none' : 'transform .18s ease', userSelect: 'none' }}
        />
      )}
      {/* Map image from backend proxy */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={mapUrl}
        src={mapUrl}
        alt={placeName ? `Carte de ${placeName}` : 'Carte géographique'}
        loading="eager"
        fetchPriority="high"
        onLoad={() => {
          setDisplayedMap({ url: mapUrl, destinationKey, zoom: requestedZoom, latitude: center.latitude, longitude: center.longitude });
          setFailedUrl(null);
        }}
        onError={() => {
          setFailedUrl(mapUrl);
          if (previousMap) {
            setZoom(previousMap.zoom);
            setRequestedZoom(previousMap.zoom);
          }
        }}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: imgLoaded || !previousMap ? 1 : 0,
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      />

      <div data-map-control style={{ position: 'absolute', top: 12, left: 12, zIndex: 12, width: 'min(240px, calc(100% - 78px))' }}>
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
            if (event.key === 'Enter' && searchResults[0]) {
              onSelectPoi?.(searchResults[0]);
              setSearchText(searchResults[0].name);
              setSearchOpen(false);
            }
          }}
          style={{ width: '100%', height: 34, border: '1px solid #d7e4df', borderRadius: 7, background: '#fff', boxShadow: '0 2px 7px rgba(0,0,0,.13)', color: '#214c46', padding: '0 10px', fontSize: 12 }}
        />
        {searchOpen && searchResults.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid #d7e4df', borderRadius: 7, boxShadow: '0 5px 16px rgba(0,0,0,.16)', marginTop: 4, overflow: 'hidden' }}>
            {searchResults.map((poi) => (
              <button key={poi.id} type="button" onClick={() => { onSelectPoi?.(poi); setSearchText(poi.name); setSearchOpen(false); }} style={{ display: 'block', width: '100%', border: 0, borderBottom: '1px solid #eaf0ed', background: '#fff', color: '#214c46', padding: '8px 10px', textAlign: 'left', fontSize: 12, cursor: 'pointer' }}>{poi.name}</button>
            ))}
          </div>
        )}
      </div>

      {selectedPoi && selectedPosition && selectedPosition.x >= 0 && selectedPosition.x <= viewportWidth && selectedPosition.y >= 0 && selectedPosition.y <= height && (
        <div
          role="img"
          aria-label={`Emplacement de ${selectedPoi.name}`}
          title={selectedPoi.name}
          style={{ position: 'absolute', zIndex: 9, left: selectedPosition.x, top: selectedPosition.y, transform: 'translate(-50%, -100%)', color: '#006f65', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.35))', pointerEvents: 'none' }}
        >
          <i className="fas fa-map-marker-alt" style={{ fontSize: '27px', WebkitTextStroke: '1px white' }} aria-hidden="true" />
        </div>
      )}

      <div
        aria-hidden="true"
        style={{ position: 'absolute', bottom: '25px', left: '10px', zIndex: 10, borderRadius: '6px', background: 'rgba(255,255,255,.9)', color: '#31524d', padding: '3px 7px', fontSize: '11px' }}
      >
        Défilez pour zoomer
      </div>

      {/* Error state */}
      {imgError && !previousMap && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafafa',
            color: '#777',
            padding: '1rem',
            textAlign: 'center',
          }}
        >
          <i className="fas fa-map-marked-alt" style={{ fontSize: '2rem', color: '#ccc', marginBottom: '0.5rem' }} />
          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Aperçu de carte indisponible</span>
          <span style={{ fontSize: '0.8rem', color: '#999' }}>Vérifiez la connexion au service géographique</span>
        </div>
      )}

      {/* Interactive Zoom Controls */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 10,
        }}
      >
        <button
          type="button"
          onClick={handleZoomIn}
          disabled={zoom >= 18}
          aria-label="Zoom avant"
          style={{
            width: '32px',
            height: '32px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            cursor: zoom >= 18 ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            opacity: zoom >= 18 ? 0.5 : 1,
          }}
        >
          +
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          disabled={zoom <= 3}
          aria-label="Zoom arrière"
          style={{
            width: '32px',
            height: '32px',
            background: '#fff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            cursor: zoom <= 3 ? 'not-allowed' : 'pointer',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
            opacity: zoom <= 3 ? 0.5 : 1,
          }}
        >
          −
        </button>
      </div>

    </div>
  );
};
