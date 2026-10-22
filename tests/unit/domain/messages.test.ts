import { SUPPORTED_LANGUAGES } from '@/domain/locale';
import { MESSAGES, messagesFor } from '@/domain/messages';

type Leaf = [path: string, text: string];

/** Every string in a catalog; message functions are called with placeholder arguments. */
function leaves(value: unknown, path = ''): Leaf[] {
  if (typeof value === 'string') return [[path, value]];
  if (typeof value === 'function') {
    return [[path, (value as (...args: string[]) => string)('A', 'B', 'C')]];
  }
  if (Array.isArray(value)) return value.flatMap((item, i) => leaves(item, `${path}[${i}]`));
  return Object.entries(value as object).flatMap(([key, item]) =>
    leaves(item, path ? `${path}.${key}` : key),
  );
}

const english = leaves(MESSAGES.en);

/**
 * Strings that are the same in English and French: unit symbols, the two temperature scales, and
 * the compass letters that coincide (N to S; only the west-side letters differ).
 */
const LANGUAGE_NEUTRAL = new Set([
  'units.windSpeed.ms.label',
  'units.windSpeed.kmh.label',
  'units.precipitation.mm.label',
  'units.distance.km',
  'units.distance.mi',
  'units.pressure',
  'units.temperature.c.label',
  'units.temperature.c.name',
  'units.temperature.f.label',
  'units.temperature.f.name',
  ...Array.from({ length: 9 }, (_, i) => `details.compass[${i}][0]`),
]);

describe('messagesFor', () => {
  it('picks the catalog for the locale language, keeping English as the fallback', () => {
    expect(messagesFor('fr-FR')).toBe(MESSAGES.fr);
    expect(messagesFor('fr-CA')).toBe(MESSAGES.fr);
    expect(messagesFor('en-GB')).toBe(MESSAGES.en);
    expect(messagesFor('de-DE')).toBe(MESSAGES.en);
  });

  it('has a catalog for every supported language', () => {
    for (const language of SUPPORTED_LANGUAGES) expect(MESSAGES[language]).toBeDefined();
  });
});

describe.each(SUPPORTED_LANGUAGES)('%s catalog', (language) => {
  const catalog = leaves(MESSAGES[language]);

  it('has exactly the same entries as English', () => {
    expect(catalog.map(([path]) => path)).toEqual(english.map(([path]) => path));
  });

  it('has no empty text', () => {
    for (const [path, text] of catalog)
      expect([path, text.trim().length > 0]).toEqual([path, true]);
  });
});

describe('French catalog', () => {
  const catalog = leaves(MESSAGES.fr);

  it('translates everything except language-neutral symbols', () => {
    const untranslated = catalog
      .filter(([path, text], i) => text === english[i]![1] && !LANGUAGE_NEUTRAL.has(path))
      .map(([path]) => path);
    expect(untranslated).toEqual([]);
  });

  it('puts a no-break space before ! ? : ; so punctuation never wraps onto its own line', () => {
    const loose = catalog.filter(([, text]) => / [!?:;]/.test(text)).map(([path]) => path);
    expect(loose).toEqual([]);
  });

  it('writes percentages the French way, with a no-break space before the sign', () => {
    expect(MESSAGES.fr.units.percent('50')).toBe('50 %');
    expect(MESSAGES.en.units.percent('50')).toBe('50%');
  });

  it('keeps the playful mood lines in a French voice', () => {
    expect(MESSAGES.fr.mood.lines.rain).toBe('Prenez un parapluie !');
    expect(MESSAGES.fr.mood.lines.clear).toBe('Grand soleil. Allez jouer !');
    expect(MESSAGES.fr.mood.scorching).toBe('Quelle fournaise. Hydratez-vous !');
  });

  it('names the days and the moment', () => {
    expect(MESSAGES.fr.time).toEqual({
      today: "Aujourd'hui",
      tomorrow: 'Demain',
      now: 'Maintenant',
    });
  });

  it('abbreviates the freshness age so no plural rules are needed', () => {
    expect(MESSAGES.fr.freshness.justNow).toBe("Mis à jour à l'instant");
    expect(MESSAGES.fr.freshness.minutesAgo(5)).toBe('Mis à jour il y a 5 min');
    expect(MESSAGES.fr.freshness.hoursAgo(3)).toBe('Mis à jour il y a 3 h');
    expect(MESSAGES.fr.freshness.daysAgo(2)).toBe('Mis à jour il y a 2 j');
  });

  it('uses the French compass letters, with O for ouest', () => {
    const abbreviations = MESSAGES.fr.details.compass.map(([abbreviation]) => abbreviation);
    expect(abbreviations).toEqual([
      'N',
      'NNE',
      'NE',
      'ENE',
      'E',
      'ESE',
      'SE',
      'SSE',
      'S',
      'SSO',
      'SO',
      'OSO',
      'O',
      'ONO',
      'NO',
      'NNO',
    ]);
  });
});
