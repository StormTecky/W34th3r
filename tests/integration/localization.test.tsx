import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { weatherQueryKey } from '@/data/query-client';
import { buildSnapshot } from '@/providers/fake/scenarios';
import { PROVIDER_ERROR_KINDS, type WeatherProvider } from '@/providers/weather-provider';
import { describeError } from '@/ui/error-messages';

import DetailsScreen from '../../app/details/[placeId]';
import HomeScreen from '../../app/index';
import PlacesScreen from '../../app/places';
import SearchScreen from '../../app/search';
import SettingsScreen from '../../app/settings';
import { PARIS, TOKYO } from '../helpers/places';
import {
  buildTestEnvironment,
  createTestQueryClient,
  renderWithProviders,
} from '../helpers/render';

jest.mock('expo-location', () => ({
  Accuracy: { Lowest: 1, Low: 2, Balanced: 3 },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const mocked = Location as jest.Mocked<typeof Location>;
const { useLocalSearchParams } = jest.requireMock('expo-router') as {
  useLocalSearchParams: jest.Mock;
};

/** 14:20 in Paris (UTC+2); the fake sun rose 4 hours ago and sets in 8 hours. */
const NOW = Math.floor(Date.parse('2026-10-20T12:20:00Z') / 1000);
const FR = { locale: 'fr-FR', now: NOW } as const;
const NBSP = ' ';

function permission(status: 'granted' | 'denied' | 'undetermined') {
  return {
    status,
    granted: status === 'granted',
    canAskAgain: status !== 'denied',
    expires: 'never',
  } as never;
}

beforeEach(() => {
  for (const fn of [
    mocked.getForegroundPermissionsAsync,
    mocked.getLastKnownPositionAsync,
    mocked.getCurrentPositionAsync,
  ]) {
    fn.mockReset();
  }
  mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('granted'));
  mocked.getLastKnownPositionAsync.mockResolvedValue(null);
  mocked.getCurrentPositionAsync.mockResolvedValue({
    coords: { latitude: 48.8566, longitude: 2.3522 },
    timestamp: 0,
  } as never);
  useLocalSearchParams.mockReturnValue({ placeId: 'current' });
  jest.spyOn(Date, 'now').mockReturnValue(NOW * 1000);
  for (const level of ['debug', 'info', 'warn', 'error'] as const) {
    jest.spyOn(console, level).mockImplementation(() => undefined);
  }
});

afterEach(() => jest.restoreAllMocks());

const hero = () => screen.findByTestId('current-temperature');

describe('Home in French', () => {
  it('writes the chips, the mood line and the spoken summary in French', async () => {
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'clear-day' });
    await hero();
    expect(screen.getByText('Paris')).toBeTruthy();
    expect(screen.getByText(`Grand soleil. Allez jouer${NBSP}!`)).toBeTruthy();
    expect(screen.getByText('Ressenti 21°')).toBeTruthy();
    expect(screen.getByText('Max. 25°  Min. 15°')).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Paris. 21 degrés. Clear sky. Ressenti 21 degrés. Maximum 25, minimum 15.',
      ),
    ).toBeTruthy();
  });

  it('shows the playful line for other weather too', async () => {
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'rain-day' });
    await hero();
    expect(screen.getByText(`Prenez un parapluie${NBSP}!`)).toBeTruthy();
  });

  it('names the navigation buttons in French', async () => {
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'clear-day' });
    await hero();
    for (const name of ['Lieux enregistrés', 'Détails météo', 'Rechercher', 'Paramètres']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
  });

  it('titles the forecasts and labels the days and hours in French', async () => {
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'clear-day' });
    await hero();
    expect(screen.getByRole('header', { name: 'Prévisions horaires' })).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Prévisions à 7 jours' })).toBeTruthy();
    expect(screen.getByText('Maintenant')).toBeTruthy();
    expect(screen.getByText("Aujourd'hui")).toBeTruthy();
    expect(screen.getByText('Demain')).toBeTruthy();
    expect(screen.getByText('15 h')).toBeTruthy();
    const days = screen.getAllByTestId('daily-row').map((row) => row.props.accessibilityLabel);
    expect(days[2]).toMatch(/^Jeudi, maximum \d+, minimum \d+, Clear sky, \d+ pour cent/);
  });

  it('announces loading in French', async () => {
    const provider = {
      getWeather: () => new Promise(() => undefined),
      reverseGeocode: async () => null,
    } as unknown as WeatherProvider;
    await renderWithProviders(<HomeScreen />, { ...FR, provider });
    expect(await screen.findByLabelText('Chargement de la météo')).toBeTruthy();
  });

  it('calls an unnamed place "Position actuelle"', async () => {
    mocked.getCurrentPositionAsync.mockResolvedValue({
      coords: { latitude: -60, longitude: 0 },
      timestamp: 0,
    } as never);
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'clear-day' });
    expect(await screen.findByText('Position actuelle')).toBeTruthy();
  });

  it('follows the Fahrenheit choice but keeps the French words', async () => {
    await renderWithProviders(<HomeScreen />, {
      ...FR,
      scenario: 'clear-day',
      preferences: { temperatureUnit: 'f' },
    });
    await hero();
    expect(screen.getByText('Ressenti 69°')).toBeTruthy();
  });

  it('keeps English for a language the app does not translate', async () => {
    await renderWithProviders(<HomeScreen />, { locale: 'de-DE', now: NOW, scenario: 'clear-day' });
    await hero();
    expect(screen.getByText("Sun's out. Go play!")).toBeTruthy();
    expect(screen.getByText('Feels like 21°')).toBeTruthy();
  });

  it('uses the 24-hour clock of an English device in Great Britain', async () => {
    await renderWithProviders(<HomeScreen />, {
      locale: 'en-GB',
      now: NOW,
      scenario: 'clear-day',
    });
    await hero();
    expect(screen.getByText('Now')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
  });

  it('asks the provider for French place and condition names', async () => {
    const env = await buildTestEnvironment({ ...FR, scenario: 'clear-day' });
    const spy = jest.spyOn(env.fake, 'getWeather');
    await renderWithProviders(<HomeScreen />, { environment: env });
    await hero();
    expect(spy).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ locale: 'fr-FR' }),
    );
  });
});

describe('failures in French', () => {
  it.each(PROVIDER_ERROR_KINDS)('explains %s in French, without a blank screen', async (kind) => {
    const { title, message } = describeError(kind, 'fr-FR');
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: kind });
    expect(await screen.findByText(title)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
    expect(title).not.toBe(describeError(kind).title);
  });

  it('offers to try again in French', async () => {
    const env = await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'offline' });
    expect(await screen.findByText('Vous êtes hors ligne')).toBeTruthy();
    env.fake.setScenario('clear-day');
    await fireEvent.press(screen.getByRole('button', { name: 'Réessayer' }));
    await hero();
  });

  it('keeps cached weather and shows its age in French when a refresh fails', async () => {
    const queryClient = createTestQueryClient();
    const age = 30 * 60;
    const at = Math.floor(Date.now() / 1000) - age;
    queryClient.setQueryData(
      weatherQueryKey('current', 'fr'),
      {
        ...buildSnapshot('clear-day', { placeId: 'current', timeZone: 'Europe/Paris', now: at }),
        fetchedAt: at,
      },
      { updatedAt: Date.now() - age * 1000 },
    );
    await renderWithProviders(<HomeScreen />, { ...FR, scenario: 'offline', queryClient });
    expect(await screen.findByText('Mis à jour il y a 30 min')).toBeTruthy();
    expect(screen.getByTestId('current-temperature').props.children).toBe('21°');
    expect(await screen.findByText('Vous êtes hors ligne')).toBeTruthy();
  });

  it('explains a missing location permission in French', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('denied'));
    await renderWithProviders(<HomeScreen />, FR);
    expect(await screen.findByText('La localisation est désactivée')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ouvrir les Paramètres' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rechercher un lieu' })).toBeTruthy();
  });

  it('asks for location permission in French', async () => {
    mocked.getForegroundPermissionsAsync.mockResolvedValue(permission('undetermined'));
    await renderWithProviders(<HomeScreen />, FR);
    expect(await screen.findByText('Voir la météo là où vous êtes')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Utiliser ma position' })).toBeTruthy();
  });
});

describe('Details in French', () => {
  async function renderDetails(options: Parameters<typeof renderWithProviders>[1] = {}) {
    const view = await renderWithProviders(<DetailsScreen />, { ...FR, ...options });
    await screen.findByText('Humidité');
    return view;
  }

  it('titles the tiles and writes the measurements the French way', async () => {
    await renderDetails({ scenario: 'clear-day' });
    for (const title of ['Vent', 'Indice UV', 'Humidité', 'Visibilité', 'Pression', 'Soleil']) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
    expect(screen.getByText('Rafales 22 km/h')).toBeTruthy();
    expect(screen.getByText('OSO')).toBeTruthy();
    expect(screen.getByText(`48${NBSP}%`)).toBeTruthy();
    expect(screen.getByText('Modéré')).toBeTruthy();
    expect(screen.getByText('1018 hPa')).toBeTruthy();
    expect(
      screen.getByLabelText("Vent 12 km/h de l'ouest-sud-ouest, rafales 22 km/h"),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(
        'Indice UV 5, Modéré. Portez de la crème solaire et des lunettes de soleil.',
      ),
    ).toBeTruthy();
  });

  it('shows sunrise and sunset on the 24-hour clock', async () => {
    await renderDetails({ scenario: 'clear-day' });
    expect(screen.getByText('10:20')).toBeTruthy();
    expect(screen.getByText('22:20')).toBeTruthy();
    expect(screen.getByLabelText('Lever du soleil 10:20, coucher 22:20')).toBeTruthy();
  });

  it('writes wind with a decimal comma when the user picks metres per second', async () => {
    await renderDetails({ scenario: 'clear-day', preferences: { windSpeedUnit: 'ms' } });
    expect(screen.getByText('3,2 m/s')).toBeTruthy();
  });

  it('says what is unavailable in French', async () => {
    await renderDetails({ scenario: 'missing-optionals' });
    expect(screen.getByLabelText('Indice UV indisponible')).toBeTruthy();
    expect(screen.getAllByText('Indisponible')).toHaveLength(2);
  });

  it('flags alerts in French and opens them with French labels', async () => {
    await renderDetails({ scenario: 'alerts-active' });
    const banner = screen.getByTestId('alert-banner');
    expect(banner.props.accessibilityHint).toBe("Ouvre l'alerte complète");
    expect(banner.props.accessibilityLabel).toMatch(/^(Extrême|Sévère|Modérée|Mineure|Alerte): /);
    await fireEvent.press(banner);
    expect((await screen.findAllByText(/^Émis par /)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Fermer' })).toBeTruthy();
  });
});

describe('Places and search in French', () => {
  it('lists places with French names for the current location and the controls', async () => {
    const env = await buildTestEnvironment({ ...FR, scenario: 'clear-day' });
    await env.placesStore.add(PARIS);
    await env.placesStore.add(TOKYO);
    await renderWithProviders(<PlacesScreen />, { environment: env });
    expect(await screen.findByRole('header', { name: 'Lieux' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /^Position actuelle/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Modifier' }));
    expect(screen.getByRole('button', { name: 'Terminé' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Monter Tokyo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Descendre Paris' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Supprimer Tokyo' })).toBeTruthy();
  });

  it('explains an empty list in French', async () => {
    await renderWithProviders(<PlacesScreen />, FR);
    expect(await screen.findByText('Aucun lieu enregistré')).toBeTruthy();
    expect(
      screen.getByText('Recherchez une ville et touchez le marque-page pour la garder ici.'),
    ).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Rechercher un lieu' })).toHaveLength(1);
  });

  it('guides the search in French from the first prompt to the result', async () => {
    await renderWithProviders(<SearchScreen />, { ...FR, scenario: 'clear-day' });
    expect(screen.getByText('Recherchez une ville ou un lieu.')).toBeTruthy();
    const box = screen.getByPlaceholderText('Ville ou lieu');
    expect(box.props.accessibilityLabel).toBe('Rechercher un lieu');

    await fireEvent.changeText(box, 'zzzzzz');
    expect(await screen.findByText('Aucun lieu trouvé')).toBeTruthy();
    expect(screen.getByText("Vérifiez l'orthographe ou essayez une ville voisine.")).toBeTruthy();

    await fireEvent.changeText(box, 'paris');
    const save = await screen.findByRole('button', { name: /^Enregistrer Paris/ });
    expect(save).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Effacer la recherche' })).toBeTruthy();
    await fireEvent.press(save);
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /^Retirer Paris.* des lieux enregistrés$/ }),
      ).toBeTruthy(),
    );
  });

  it('asks the provider to search in French', async () => {
    const env = await buildTestEnvironment({ ...FR, scenario: 'clear-day' });
    const spy = jest.spyOn(env.fake, 'searchPlaces');
    await renderWithProviders(<SearchScreen />, { environment: env });
    await fireEvent.changeText(screen.getByPlaceholderText('Ville ou lieu'), 'paris');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(spy).toHaveBeenCalledWith('paris', expect.objectContaining({ locale: 'fr-FR' }));
  });

  it('names the back button in French', async () => {
    await renderWithProviders(<SearchScreen />, FR);
    expect(screen.getByRole('button', { name: 'Retour' })).toBeTruthy();
  });
});

describe('Settings in French', () => {
  it('translates the sections, the units and their spoken names', async () => {
    await renderWithProviders(<SettingsScreen />, FR);
    for (const title of ['Température', 'Vitesse du vent', 'Précipitations', 'Apparence']) {
      expect(screen.getByRole('header', { name: title })).toBeTruthy();
    }
    for (const name of ['Celsius', 'Fahrenheit', 'Mètres par seconde', 'Kilomètres par heure']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    for (const name of ['Miles par heure', 'Nœuds', 'Millimètres', 'Pouces']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    for (const name of ['Système', 'Clair', 'Sombre']) {
      expect(screen.getByRole('radio', { name })).toBeTruthy();
    }
    expect(screen.getByText('mi/h')).toBeTruthy();
    expect(screen.getByText('nd')).toBeTruthy();
    expect(screen.getByText('po')).toBeTruthy();
  });

  it('keeps the choice working in French', async () => {
    const env = await renderWithProviders(<SettingsScreen />, FR);
    await fireEvent.press(screen.getByRole('radio', { name: 'Fahrenheit' }));
    expect(env.preferencesStore.getState().temperatureUnit).toBe('f');
  });

  it('explains where the units start from, and credits the weather data', async () => {
    await renderWithProviders(<SettingsScreen />, FR);
    expect(
      screen.getByText(
        'Les unités dépendent de votre région et ne changent que si vous le décidez.',
      ),
    ).toBeTruthy();
    expect(screen.getByRole('header', { name: 'Paramètres' })).toBeTruthy();
  });
});
