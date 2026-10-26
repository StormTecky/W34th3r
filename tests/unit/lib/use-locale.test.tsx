import { render, renderHook, screen } from '@testing-library/react-native';
import { useLocales } from 'expo-localization';
import { Text } from 'react-native';

import { LocaleProvider, useDeviceLocale, useLocale } from '@/lib/use-locale';

jest.mock('expo-localization', () => ({ useLocales: jest.fn(), getLocales: jest.fn(() => []) }));

const devicePrefers = (...tags: string[]) =>
  (useLocales as jest.Mock).mockReturnValue(tags.map((languageTag) => ({ languageTag })));

describe('useLocale', () => {
  it('speaks English (US) outside a provider, so components render on their own', async () => {
    const { result } = await renderHook(() => useLocale());
    expect(result.current.locale).toBe('en-US');
    expect(result.current.language).toBe('en');
    expect(result.current.messages.common.tryAgain).toBe('Try again');
  });

  it('gives the locale, the language and the texts of the provider', async () => {
    const { result } = await renderHook(() => useLocale(), {
      wrapper: ({ children }) => <LocaleProvider locale="fr-CA">{children}</LocaleProvider>,
    });
    expect(result.current.locale).toBe('fr-CA');
    expect(result.current.language).toBe('fr');
    expect(result.current.messages.common.tryAgain).toBe('Réessayer');
  });

  it('keeps the same value while the locale does not change', async () => {
    const { result, rerender } = await renderHook(() => useLocale(), {
      wrapper: ({ children }) => <LocaleProvider locale="fr-FR">{children}</LocaleProvider>,
    });
    const first = result.current;
    await rerender({});
    expect(result.current).toBe(first);
  });

  it('shows the texts of whichever language the provider has', async () => {
    function Greeting() {
      return <Text>{useLocale().messages.time.today}</Text>;
    }
    await render(
      <LocaleProvider locale="fr-FR">
        <Greeting />
      </LocaleProvider>,
    );
    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
  });
});

describe('useDeviceLocale', () => {
  it('keeps the full tag of the first preferred language the app translates', async () => {
    devicePrefers('fr-FR', 'en-US');
    expect((await renderHook(() => useDeviceLocale())).result.current).toBe('fr-FR');
  });

  it('skips languages the app does not translate', async () => {
    devicePrefers('de-DE', 'fr-CH');
    expect((await renderHook(() => useDeviceLocale())).result.current).toBe('fr-CH');
  });

  it('falls back to English (US) when nothing the device prefers is translated', async () => {
    devicePrefers('ja-JP', 'es-ES');
    expect((await renderHook(() => useDeviceLocale())).result.current).toBe('en-US');
  });

  it('follows the device when its language changes', async () => {
    devicePrefers('en-GB');
    const { result, rerender } = await renderHook(() => useDeviceLocale());
    expect(result.current).toBe('en-GB');
    devicePrefers('fr-FR');
    await rerender({});
    expect(result.current).toBe('fr-FR');
  });
});
