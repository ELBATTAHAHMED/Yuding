/** Provider-neutral weather contract exposed by GET /travel/weather. */
export type WeatherCondition =
  | 'CLEAR'
  | 'PARTLY_CLOUDY'
  | 'CLOUDY'
  | 'FOG'
  | 'DRIZZLE'
  | 'RAIN'
  | 'SNOW'
  | 'SHOWERS'
  | 'THUNDERSTORM'
  | 'UNKNOWN';

export interface WeatherCurrent {
  time: string;
  temperature?: number;
  apparentTemperature?: number;
  relativeHumidity?: number;
  weatherCode?: number;
  condition: WeatherCondition;
  conditionLabel: string;
  day?: boolean;
  precipitation?: number;
  rain?: number;
  windSpeed?: number;
  windDirection?: number;
  windDirectionLabel?: string;
  windGusts?: number;
}

export interface WeatherHourlyForecast {
  time: string;
  temperature?: number;
  apparentTemperature?: number;
  relativeHumidity?: number;
  precipitationProbability?: number;
  precipitation?: number;
  rain?: number;
  weatherCode?: number;
  condition: WeatherCondition;
  conditionLabel: string;
  windSpeed?: number;
}

export interface WeatherDailyForecast {
  date: string;
  weatherCode?: number;
  condition: WeatherCondition;
  conditionLabel: string;
  temperatureMin?: number;
  temperatureMax?: number;
  precipitationProbabilityMax?: number;
  precipitationSum?: number;
  rainSum?: number;
  windSpeedMax?: number;
  windGustsMax?: number;
  sunrise?: string;
  sunset?: string;
}

export interface WeatherResponse {
  provider: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  temperatureUnit?: string;
  windSpeedUnit?: string;
  precipitationUnit?: string;
  current?: WeatherCurrent;
  hourlyForecast: WeatherHourlyForecast[];
  dailyForecast: WeatherDailyForecast[];
}

export interface WeatherParams {
  lat: number;
  lon: number;
  forecastDays?: number;
}
