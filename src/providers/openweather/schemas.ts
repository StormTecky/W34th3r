import { z } from 'zod';

/**
 * Schemas for the parts of the OpenWeather One Call 3.0 response the app uses
 * (see specs/001-weather-app/contracts/openweather-api.md). Objects are non-strict: unknown fields
 * are ignored. Optional provider fields are `nullish` so a `null` degrades like a missing key.
 */

const weatherEntry = z.object({
  id: z.number(),
  description: z.string().default(''),
});

const weatherList = z.array(weatherEntry).min(1);

const current = z.object({
  dt: z.number(),
  sunrise: z.number().nullish(),
  sunset: z.number().nullish(),
  temp: z.number(),
  feels_like: z.number(),
  pressure: z.number(),
  humidity: z.number(),
  wind_speed: z.number(),
  wind_deg: z.number().nullish(),
  wind_gust: z.number().nullish(),
  uvi: z.number().nullish(),
  visibility: z.number().nullish(),
  weather: weatherList,
});

const hourly = z.object({
  dt: z.number(),
  temp: z.number(),
  pop: z.number().nullish(),
  weather: weatherList,
});

const daily = z.object({
  dt: z.number(),
  sunrise: z.number().nullish(),
  sunset: z.number().nullish(),
  temp: z.object({ min: z.number(), max: z.number() }),
  pop: z.number().nullish(),
  weather: weatherList,
});

const alert = z.object({
  sender_name: z.string().default(''),
  event: z.string(),
  start: z.number(),
  end: z.number(),
  description: z.string().default(''),
  tags: z.array(z.string()).nullish(),
});

export const oneCallSchema = z.object({
  timezone: z.string().min(1),
  timezone_offset: z.number().default(0),
  current,
  hourly: z.array(hourly).min(1),
  daily: z.array(daily).min(1),
  alerts: z.array(alert).nullish(),
});

export type OneCallResponse = z.infer<typeof oneCallSchema>;

const geocodingItem = z.object({
  name: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  country: z.string().min(1),
  state: z.string().nullish(),
});

/** Both `/geo/1.0/direct` and `/geo/1.0/reverse` return an array of these. */
export const geocodingSchema = z.array(geocodingItem);

export type GeocodingItem = z.infer<typeof geocodingItem>;
