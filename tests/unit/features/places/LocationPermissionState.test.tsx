import { screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { LocationPermissionState } from '@/features/places/LocationPermissionState';
import { getTheme } from '@/theme/theme-engine';

import { renderWithProviders } from '../../../helpers/render';

const theme = getTheme('clear', true);

afterEach(() => jest.restoreAllMocks());

describe('the main action', () => {
  it('is left out when the screen cannot act on it', async () => {
    await renderWithProviders(<LocationPermissionState variant="undetermined" theme={theme} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('is left out in a browser when there is no way to check again', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderWithProviders(<LocationPermissionState variant="denied" theme={theme} />);
    expect(screen.getByText('Location is blocked')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('opens Settings on a phone when location is denied', async () => {
    await renderWithProviders(<LocationPermissionState variant="denied" theme={theme} />);
    expect(screen.getByText('Location is off')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Open Settings' })).toBeTruthy();
  });

  it('is not offered in French either, with the browser copy translated', async () => {
    jest.replaceProperty(Platform, 'OS', 'web');
    await renderWithProviders(
      <LocationPermissionState variant="denied" theme={theme} onRetry={jest.fn()} />,
      { locale: 'fr-FR' },
    );
    expect(screen.getByText('La localisation est bloquée')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Réessayer' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Ouvrir les Paramètres' })).toBeNull();
  });
});
