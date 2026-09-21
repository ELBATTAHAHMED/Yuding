'use client';

import React from 'react';
import { useWeather } from '@/hooks/queries/useWeather';
import type { WeatherCondition, WeatherDailyForecast } from '@/types/weather.types';

export interface DestinationWeatherProps {
  latitude: number;
  longitude: number;
  destinationName: string;
  forecastDays?: number;
}

const weatherIconClass = (condition: WeatherCondition, isDay = true) => {
  switch (condition) {
    case 'CLEAR': return isDay ? 'fas fa-sun' : 'fas fa-moon';
    case 'PARTLY_CLOUDY': return isDay ? 'fas fa-cloud-sun' : 'fas fa-cloud-moon';
    case 'CLOUDY': return 'fas fa-cloud';
    case 'FOG': return 'fas fa-smog';
    case 'DRIZZLE': return 'fas fa-cloud-rain';
    case 'RAIN': return 'fas fa-cloud-showers-heavy';
    case 'SNOW': return 'fas fa-snowflake';
    case 'SHOWERS': return 'fas fa-cloud-showers-heavy';
    case 'THUNDERSTORM': return 'fas fa-bolt';
    default: return 'fas fa-cloud';
  }
};

const formatTemperature = (value?: number) => value === undefined || value === null ? '—' : `${Math.round(value)}°`;

const dayLabel = (daily: WeatherDailyForecast, index: number) => {
  if (index === 0) return 'Aujourd’hui';
  const date = new Date(`${daily.date}T12:00:00`);
  return new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(date);
};

export const DestinationWeather: React.FC<DestinationWeatherProps> = ({
  latitude,
  longitude,
  destinationName,
  forecastDays = 7,
}) => {
  const weather = useWeather({ lat: latitude, lon: longitude, forecastDays });

  if (weather.isLoading) {
    return (
      <section aria-live="polite" style={{ background: '#f2fbfa', border: '1px solid #cce9e5', borderRadius: '12px', padding: '1rem', color: '#01796F' }}>
        <i className="fas fa-spinner fa-spin" aria-hidden="true" style={{ marginRight: '0.5rem' }} />
        Chargement de la météo locale…
      </section>
    );
  }

  if (weather.isError) {
    return (
      <section role="status" style={{ background: '#fff8ed', border: '1px solid #f0c98c', borderRadius: '12px', padding: '1rem', color: '#795300', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
        <span><i className="fas fa-cloud-sun" aria-hidden="true" style={{ marginRight: '0.5rem' }} />Météo temporairement indisponible.</span>
        <button type="button" onClick={() => weather.refetch()} style={{ border: '1px solid #b58228', background: '#fff', color: '#795300', padding: '0.35rem 0.7rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
          Réessayer
        </button>
      </section>
    );
  }

  const data = weather.data;
  if (!data) return null;
  const current = data.current;

  return (
    <section aria-label={`Météo à ${destinationName}`} style={{ background: 'linear-gradient(135deg, #edf9f7 0%, #f8fcff 100%)', border: '1px solid #cce9e5', borderRadius: '14px', padding: '1.15rem', boxShadow: '0 3px 10px rgba(0, 77, 64, 0.05)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, color: '#01796F', fontSize: '1.15rem', fontWeight: 800 }}>
            <i className="fas fa-cloud-sun" aria-hidden="true" style={{ marginRight: '0.45rem' }} />Météo à {destinationName}
          </h3>
          {data.timezone && <p style={{ margin: '0.2rem 0 0', color: '#55736f', fontSize: '0.78rem' }}>Heures locales · {data.timezone}</p>}
        </div>
        {current && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: '#014d47' }}>
            <i className={weatherIconClass(current.condition, current.day !== false)} aria-label={current.conditionLabel} style={{ fontSize: '2rem', color: '#d68800' }} />
            <div>
              <strong style={{ fontSize: '1.65rem', lineHeight: 1 }}>{formatTemperature(current.temperature)}</strong>
              <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>{current.conditionLabel}</div>
              <div style={{ fontSize: '0.75rem', color: '#55736f' }}>Ressenti {formatTemperature(current.apparentTemperature)} · Vent {current.windSpeed ?? '—'} {data.windSpeedUnit || 'km/h'}{current.windDirectionLabel ? ` ${current.windDirectionLabel}` : ''}</div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
        {data.dailyForecast.map((daily, index) => (
          <article key={daily.date} style={{ flex: '0 0 118px', minWidth: '118px', background: '#fff', border: '1px solid #dcefea', borderRadius: '10px', padding: '0.7rem', textAlign: 'center' }}>
            <div style={{ minHeight: '2rem', color: '#245a55', fontSize: '0.78rem', fontWeight: 700, textTransform: 'capitalize' }}>{dayLabel(daily, index)}</div>
            <i className={weatherIconClass(daily.condition)} aria-label={daily.conditionLabel} style={{ color: '#d68800', fontSize: '1.35rem', margin: '0.35rem 0' }} />
            <div style={{ color: '#1d4540', fontWeight: 800 }}>{formatTemperature(daily.temperatureMax)} <span style={{ color: '#77908d', fontWeight: 600 }}>{formatTemperature(daily.temperatureMin)}</span></div>
            <div style={{ color: '#55736f', fontSize: '0.7rem', marginTop: '0.25rem' }}><i className="fas fa-tint" aria-hidden="true" /> {daily.precipitationProbabilityMax ?? 0}%</div>
          </article>
        ))}
      </div>

      <p style={{ margin: '0.75rem 0 0', color: '#6b817e', fontSize: '0.7rem', textAlign: 'right' }}>
        Données météo par <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#01796F' }}>Open-Meteo.com</a>
      </p>
    </section>
  );
};
