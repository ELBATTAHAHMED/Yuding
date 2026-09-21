import { apiClient } from '../lib/api-client.ts';
import type { WeatherParams, WeatherResponse } from '../types/weather.types.ts';

/**
 * Weather is always requested through the API Gateway. Open-Meteo is never
 * called by the browser and no provider configuration is exposed to it.
 */
export const weatherService = {
  async getWeather(params: WeatherParams): Promise<WeatherResponse> {
    const query = new URLSearchParams();
    query.set('lat', String(params.lat));
    query.set('lon', String(params.lon));
    if (params.forecastDays !== undefined) query.set('forecastDays', String(params.forecastDays));

    return apiClient.get<WeatherResponse>(`/travel/weather?${query.toString()}`);
  },
};
