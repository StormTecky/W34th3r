import { DEFAULT_LOCALE, languageOf, resolveLocale, SUPPORTED_LANGUAGES } from '@/domain/locale';

describe('SUPPORTED_LANGUAGES', () => {
  it('starts with English and French', () => {
    expect(SUPPORTED_LANGUAGES).toEqual(['en', 'fr']);
  });
});

describe('languageOf', () => {
  it.each([
    ['en-US', 'en'],
    ['en-GB', 'en'],
    ['EN-us', 'en'],
    ['fr', 'fr'],
    ['fr-FR', 'fr'],
    ['fr-CA', 'fr'],
    ['fr-CH', 'fr'],
  ])('reads the language of %s as %s', (tag, language) => {
    expect(languageOf(tag)).toBe(language);
  });

  it('uses English for languages the app does not translate yet', () => {
    expect(languageOf('de-DE')).toBe('en');
    expect(languageOf('ja')).toBe('en');
  });

  it('uses English for empty or malformed tags', () => {
    expect(languageOf('')).toBe('en');
    expect(languageOf('fr_FR')).toBe('en');
    expect(languageOf('1234')).toBe('en');
  });
});

describe('resolveLocale', () => {
  it('keeps the full tag of the first preferred locale the app can translate', () => {
    expect(resolveLocale(['fr-FR', 'en-US'])).toBe('fr-FR');
    expect(resolveLocale(['fr-CA'])).toBe('fr-CA');
  });

  it('skips preferred languages the app does not support', () => {
    expect(resolveLocale(['de-DE', 'ja-JP', 'fr-CH', 'en-GB'])).toBe('fr-CH');
  });

  it('keeps the English region so formats such as the 24-hour clock follow the device', () => {
    expect(resolveLocale(['en-GB'])).toBe('en-GB');
  });

  it('falls back to the default locale when nothing is supported or nothing is given', () => {
    expect(DEFAULT_LOCALE).toBe('en-US');
    expect(resolveLocale([])).toBe(DEFAULT_LOCALE);
    expect(resolveLocale(['de-DE', 'es-ES'])).toBe(DEFAULT_LOCALE);
  });

  it('ignores malformed tags instead of passing them on to Intl', () => {
    expect(resolveLocale(['', 'x', 'fr_FR', 'fr-FR'])).toBe('fr-FR');
    expect(resolveLocale(['fr_FR'])).toBe(DEFAULT_LOCALE);
  });
});
