'use client';

import React from 'react';
import { useWeather } from '@/hooks/queries/useWeather';
import type { WeatherCondition, WeatherDailyForecast } from '@/types/weather.types';
import styles from './DestinationWeather.module.css';

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
      <div className={styles.status} aria-live="polite">
        <i className="fas fa-spinner fa-spin" aria-hidden="true" />
        Chargement de la météo locale…
      </div>
    );
  }

  if (weather.isError) {
    return (
      <div className={`${styles.status} ${styles.error}`} role="status">
        <span><i className="fas fa-cloud-sun" aria-hidden="true" />Météo temporairement indisponible.</span>
        <button type="button" onClick={() => weather.refetch()}>
          Réessayer
        </button>
      </div>
    );
  }

  const data = weather.data;
  if (!data) return null;
  const current = data.current;

  return (
    <div role="region" aria-label={`Météo à ${destinationName}`} className={styles.panel}>
      <div className={styles.topRow}>
        <div>
          <h3 className={styles.title}>
            <i className="fas fa-cloud-sun" aria-hidden="true" />Météo à {destinationName}
          </h3>
          {data.timezone && <p className={styles.timezone}>Heures locales · {data.timezone}</p>}
        </div>
        {current && (
          <div className={styles.current}>
            <i className={weatherIconClass(current.condition, current.day !== false)} aria-label={current.conditionLabel} />
            <div>
              <strong className={styles.temperature}>{formatTemperature(current.temperature)}</strong>
              <div className={styles.condition}>{current.conditionLabel}</div>
              <div className={styles.currentMeta}>Ressenti {formatTemperature(current.apparentTemperature)} · Vent {current.windSpeed ?? '—'} {data.windSpeedUnit || 'km/h'}{current.windDirectionLabel ? ` ${current.windDirectionLabel}` : ''}</div>
            </div>
          </div>
        )}
      </div>

      <div className={styles.forecast}>
        {data.dailyForecast.map((daily, index) => (
          <article key={daily.date} className={styles.dayCard}>
            <div className={styles.dayLabel}>{dayLabel(daily, index)}</div>
            <i className={`${weatherIconClass(daily.condition)} ${styles.dayIcon}`} aria-label={daily.conditionLabel} />
            <div className={styles.dayTemp}>{formatTemperature(daily.temperatureMax)} <span>{formatTemperature(daily.temperatureMin)}</span></div>
            <div className={styles.precipitation}><i className="fas fa-tint" aria-hidden="true" /> {daily.precipitationProbabilityMax == null ? '—' : `${daily.precipitationProbabilityMax}%`}</div>
          </article>
        ))}
      </div>

      <p className={styles.source}>
        Données météo par <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo.com</a>
      </p>
    </div>
  );
};
