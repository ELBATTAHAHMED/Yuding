'use client';

import React, { useState, useMemo } from 'react';
import type { NearbyPlace } from '@/types/geo.types';
import { geoService } from '@/services/geo.service';

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
  pois = [],
  selectedPoi,
  height = 360,
  width = 640,
}) => {
  const [zoom, setZoom] = useState(13);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Active focus center: if a POI is selected, center on that POI, otherwise on place
  const activeLat = selectedPoi ? selectedPoi.latitude : latitude;
  const activeLon = selectedPoi ? selectedPoi.longitude : longitude;

  // Build marker query for Geoapify static map
  const markersParam = useMemo(() => {
    const markers: string[] = [];

    // Main destination marker
    markers.push(`lonlat:${longitude},${latitude}`);

    // Nearby POI markers
    pois.slice(0, 10).forEach((p) => {
      if (p.latitude && p.longitude) {
        markers.push(`lonlat:${p.longitude},${p.latitude}`);
      }
    });

    return markers.join('|');
  }, [latitude, longitude, pois, selectedPoi]);

  // Generate backend-proxied map URL (zero client API key)
  const mapUrl = useMemo(() => {
    return geoService.getStaticMapUrl({
      lat: activeLat,
      lon: activeLon,
      zoom,
      width: Math.min(width, 1000),
      height: Math.min(height, 800),
      markers: markersParam,
    });
  }, [activeLat, activeLon, zoom, width, height, markersParam]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 1, 3));
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: `${height}px`,
        borderRadius: '12px',
        overflow: 'hidden',
        border: '1px solid #e0e0e0',
        background: '#f5f5f5',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.08)',
      }}
    >
      {/* Map image from backend proxy */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={mapUrl}
        alt={placeName ? `Carte de ${placeName}` : 'Carte géographique'}
        onLoad={() => {
          setImgLoaded(true);
          setImgError(false);
        }}
        onError={() => setImgError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: 'block',
          opacity: imgLoaded ? 1 : 0.6,
          transition: 'opacity 0.3s ease',
        }}
      />

      {/* Loading overlay */}
      {!imgLoaded && !imgError && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.7)',
            color: '#01796F',
            fontSize: '0.9rem',
            gap: '0.5rem',
          }}
        >
          <i className="fas fa-spinner fa-spin" />
          Chargement de la carte...
        </div>
      )}

      {/* Error state */}
      {imgError && (
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

      {/* Mandatory OpenStreetMap & Geoapify Attribution */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          padding: '2px 8px',
          fontSize: '0.68rem',
          color: '#444',
          borderRadius: '4px 0 0 0',
          backdropFilter: 'blur(2px)',
          zIndex: 10,
          display: 'flex',
          gap: '4px',
        }}
      >
        <span>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: '#01796F', textDecoration: 'none' }}>OpenStreetMap</a></span>
        <span>|</span>
        <span>Powered by <a href="https://www.geoapify.com" target="_blank" rel="noopener noreferrer" style={{ color: '#01796F', textDecoration: 'none' }}>Geoapify</a></span>
      </div>
    </div>
  );
};
