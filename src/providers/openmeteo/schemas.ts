import { z } from 'zod';

/**
 * Schemas for the Open-Meteo forecast and geocoding responses, and for the reverse-geocoding
 * service used to name the device location. Objects are non-strict: unknown fields are ignored.
 * Hourly and daily series may hold `null` where the provider has no value.
 */

const series = z.array(z.number().nullable());

const current = z.object({
  time: z.number(),
  temperature_2m: z.number(),
  apparent_temperature: z.number(),
  relative_humidity_2m: z.number(),
  is_day: z.number(),
  weather_code: z.number(),
  pressure_msl: z.number(),
  wind_speed_10m: z.number(),
  wind_direction_10m: z.number().nullish(),
  wind_gusts_10m: z.number().nullish(),
});

const hourly = z.object({
  time: z.array(z.number()),
  temperature_2m: series,
  weather_code: series,
  precipitation_probability: series.optional(),
  uv_index: series.optional(),
  visibility: series.optional(),
});

const daily = z.object({
  time: z.array(z.number()),
  weather_code: series,
  temperature_2m_max: series,
  temperature_2m_min: series,
  sunrise: series,
  sunset: series,
  precipitation_probability_max: series.optional(),
});

export const forecastSchema = z.object({
  timezone: z.string().min(1),
  utc_offset_seconds: z.number().default(0),
  current,
  hourly,
  daily,
});

export type ForecastResponse = z.infer<typeof forecastSchema>;

const searchResult = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  country_code: z.string().nullish(),
  country: z.string().nullish(),
  admin1: z.string().nullish(),
  timezone: z.string().nullish(),
});

/** A search with no matches has no `results` key at all. */
export const searchSchema = z.object({ results: z.array(searchResult).optional() });

export type SearchResult = z.infer<typeof searchResult>;

export const reverseSchema = z.object({
  city: z.string().nullish(),
  locality: z.string().nullish(),
  principalSubdivision: z.string().nullish(),
  countryCode: z.string().nullish(),
  countryName: z.string().nullish(),
});
