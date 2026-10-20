/**
 * Calls the real Open-Meteo services through the app's own provider and prints a summary.
 * A manual check that the mappers cope with live data; it is not part of the test suite.
 *
 *   npx tsx scripts/smoke-live.ts
 */
import { createOpenMeteoProvider } from '../src/providers/openmeteo';
import { formatClockTime } from '../src/domain/time';

const provider = createOpenMeteoProvider({ timeoutMs: 15_000 });

const PLACES = [
  ['Paris', 48.86, 2.35],
  ['Tokyo', 35.68, 139.69],
  ['Sydney', -33.87, 151.21],
  ['Kiritimati (UTC+14)', 1.87, -157.4],
  ['Kolkata (UTC+5:30)', 22.57, 88.36],
  ['Longyearbyen (polar)', 78.22, 15.65],
  ['Ocean, mid-Pacific', 0, -140],
] as const;

async function showWeather(name: string, lat: number, lon: number) {
  const s = await provider.getWeather({ id: `${lat},${lon}`, lat, lon });
  const c = s.current;
  const sun = (epoch: number) => (epoch ? formatClockTime(epoch, s.timeZone) : 'n/a');
  console.log(
    `${name.padEnd(22)} ${String(c.temperature).padStart(5)}°C  ${c.summary.padEnd(16)} ` +
      `${s.timeZone.padEnd(18)} day=${c.isDay} hourly=${s.hourly.length} daily=${s.daily.length} ` +
      `uv=${c.uvIndex ?? '-'} vis=${c.visibility ?? '-'} sun=${sun(c.sunrise)}-${sun(c.sunset)}`,
  );
}

async function showPlaces() {
  const found = await provider.searchPlaces('Springfield');
  console.log(
    'search Springfield:',
    found.map((p) => `${p.name}, ${p.region}, ${p.country} [${p.timeZone}]`).join(' | '),
  );
  console.log('search nothing:', (await provider.searchPlaces('zzzzqqxx')).length);
  const here = await provider.reverseGeocode(48.8566, 2.3522);
  console.log('reverse Paris:', here?.name, '|', here?.region, '|', here?.country);
  console.log('reverse ocean:', (await provider.reverseGeocode(0, -140))?.name ?? null);
}

async function main() {
  for (const [name, lat, lon] of PLACES) await showWeather(name, lat, lon);
  await showPlaces();
}

main().catch((e: unknown) => {
  console.error('FAILED', e instanceof Error ? `${e.name}: ${e.message}` : e);
  process.exit(1);
});
