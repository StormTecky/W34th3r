import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { SUPPORTED_LANGUAGES } from '@/domain/locale';

const root = resolve(__dirname, '../../..');
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));

const { expo } = readJson('app.json');

describe('native strings per language', () => {
  const others = SUPPORTED_LANGUAGES.filter((language) => language !== 'en');

  it('registers a strings file for every translated language except English, the default', () => {
    expect(Object.keys(expo.locales ?? {}).sort()).toEqual([...others].sort());
  });

  it.each(others)('has a non-empty location permission text in %s', (language) => {
    const strings = readJson(expo.locales[language]);
    expect(strings.NSLocationWhenInUseUsageDescription).toEqual(expect.any(String));
    expect(strings.NSLocationWhenInUseUsageDescription.trim().length).toBeGreaterThan(10);
  });

  it('keeps the English text in the plugin configuration, the fallback', () => {
    const [, options] = expo.plugins.find(
      (plugin: unknown) => Array.isArray(plugin) && plugin[0] === 'expo-location',
    );
    expect(options.locationWhenInUsePermission).toMatch(/uses your location only/);
  });
});
