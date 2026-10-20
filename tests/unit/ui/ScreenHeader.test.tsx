import { fireEvent, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { ScreenHeader } from '@/ui/ScreenHeader';

import { renderWithProviders } from '../../helpers/render';

const { router } = jest.requireMock('expo-router') as {
  router: Record<'back' | 'replace' | 'canGoBack', jest.Mock>;
};

describe('ScreenHeader', () => {
  it('shows the title as a heading and any trailing controls', async () => {
    await renderWithProviders(<ScreenHeader title="Places" right={<Text>Edit</Text>} />);
    expect(screen.getByRole('header', { name: 'Places' })).toBeTruthy();
    expect(screen.getByText('Edit')).toBeTruthy();
  });

  it('goes back when there is a screen to go back to', async () => {
    router.canGoBack.mockReturnValue(true);
    await renderWithProviders(<ScreenHeader title="Places" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(router.back).toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('returns home when opened directly with nothing to go back to', async () => {
    router.canGoBack.mockReturnValue(false);
    await renderWithProviders(<ScreenHeader title="Places" />);
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.back).not.toHaveBeenCalled();
    router.canGoBack.mockReturnValue(true);
  });

  it('can take its colour from a weather theme instead of the app palette', async () => {
    await renderWithProviders(<ScreenHeader title="Paris" color="#123456" />);
    const style = StyleSheet.flatten(screen.getByText('Paris').props.style);
    expect(style.color).toBe('#123456');
  });
});
