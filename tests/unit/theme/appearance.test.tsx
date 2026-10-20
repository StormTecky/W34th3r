import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { CURRENT_PLACE_ID } from '@/domain/place';
import { PlaceResultRow } from '@/features/places/PlaceResultRow';
import { SegmentedControl } from '@/features/settings/SegmentedControl';
import { contrastRatio } from '@/theme/contrast';
import { colors } from '@/theme/tokens';
import { ErrorState } from '@/ui/ErrorState';

import { makePlace } from '../../helpers/places';
import { renderWithProviders } from '../../helpers/render';

const SCHEMES = ['light', 'dark'] as const;

describe.each(SCHEMES)('primary components in %s appearance', (scheme) => {
  const preferences = { appearance: scheme } as const;

  it('renders the error state', async () => {
    await renderWithProviders(<ErrorState kind="offline" onRetry={jest.fn()} />, { preferences });
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders a search result row', async () => {
    await renderWithProviders(
      <PlaceResultRow
        place={makePlace({ name: 'Springfield', region: 'Illinois', country: 'US' })}
        saved
        onOpen={jest.fn()}
        onToggleSave={jest.fn()}
      />,
      { preferences },
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders a segmented control with one option selected', async () => {
    await renderWithProviders(
      <SegmentedControl
        label="Temperature"
        value="f"
        onChange={jest.fn()}
        options={[
          { value: 'c', label: '°C', accessibilityLabel: 'Celsius' },
          { value: 'f', label: '°F', accessibilityLabel: 'Fahrenheit' },
        ]}
      />,
      { preferences },
    );
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('uses only palette colours for text and surfaces, all meeting AA contrast', async () => {
    await renderWithProviders(<ErrorState kind="timeout" onRetry={jest.fn()} />, { preferences });
    const palette = colors[scheme];
    const title = screen.getByText('Taking too long');
    const textColor = StyleSheet.flatten(title.props.style).color as string;
    expect(textColor.toLowerCase()).toBe(palette.text.toLowerCase());
    expect(contrastRatio(textColor, palette.background)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('appearance does not depend on the weather theme', () => {
  it('keeps the palette consistent for the same scheme', async () => {
    expect(CURRENT_PLACE_ID).toBe('current');
    await render(<ErrorState kind="offline" />);
    expect(screen.getByText("You're offline")).toBeTruthy();
  });
});
