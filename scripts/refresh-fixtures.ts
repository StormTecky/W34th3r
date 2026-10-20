/**
 * Records live OpenWeather responses into tests/contract/fixtures so the contract tests can detect
 * upstream changes before users do. Manual use only: it needs a real key and refuses to run in CI.
 *
 *   npm run fixtures:refresh
 *
 * Reads EXPO_PUBLIC_OPENWEATHER_API_KEY from .env.local. The key is never written to a fixture.
 * Review the resulting diff before committing.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const FIXTURE_DIR = join(__dirname, '..', 'tests', 'contract', 'fixtures');
const BASE_URL = 'https://api.openweathermap.org';

interface Recording {
  file: string;
  path: string;
  params: Record<string, string>;
}

// Reference places chosen to cover different time zones, hemispheres, and weather.
const RECORDINGS: Recording[] = [
  {
    file: 'live-onecall-paris.json',
    path: '/data/3.0/onecall',
    params: { lat: '48.86', lon: '2.35', units: 'metric', exclude: 'minutely' },
  },
  {
    file: 'live-onecall-sydney.json',
    path: '/data/3.0/onecall',
    params: { lat: '-33.87', lon: '151.21', units: 'metric', exclude: 'minutely' },
  },
  {
    file: 'live-onecall-kolkata.json',
    path: '/data/3.0/onecall',
    params: { lat: '22.57', lon: '88.36', units: 'metric', exclude: 'minutely' },
  },
  {
    file: 'live-geocoding-direct-springfield.json',
    path: '/geo/1.0/direct',
    params: { q: 'Springfield', limit: '5' },
  },
  {
    file: 'live-geocoding-reverse-paris.json',
    path: '/geo/1.0/reverse',
    params: { lat: '48.86', lon: '2.35', limit: '1' },
  },
];

function readApiKey(): string {
  if (process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY)
    return process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
  try {
    const env = readFileSync(join(__dirname, '..', '.env.local'), 'utf8');
    const match = env.match(/^EXPO_PUBLIC_OPENWEATHER_API_KEY=(.+)$/m);
    if (match?.[1]) return match[1].trim();
  } catch {
    // fall through to the error below
  }
  throw new Error('EXPO_PUBLIC_OPENWEATHER_API_KEY is not set (.env.local or environment).');
}

async function main(): Promise<void> {
  if (process.env.CI) {
    throw new Error('fixtures:refresh must not run in CI.');
  }
  const apiKey = readApiKey();
  mkdirSync(FIXTURE_DIR, { recursive: true });

  for (const recording of RECORDINGS) {
    const url = new URL(recording.path, BASE_URL);
    for (const [name, value] of Object.entries(recording.params)) url.searchParams.set(name, value);
    url.searchParams.set('appid', apiKey);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`${recording.path} failed with HTTP ${response.status}`);
    }
    const body: unknown = await response.json();
    writeFileSync(join(FIXTURE_DIR, recording.file), JSON.stringify(body, null, 2) + '\n');
    console.log(`recorded ${recording.file}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
