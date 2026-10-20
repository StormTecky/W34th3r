import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { PROVIDER_ERROR_KINDS, type ProviderErrorKind } from '@/providers/weather-provider';
import { describeError } from '@/ui/error-messages';
import { ErrorState } from '@/ui/ErrorState';

const RETRYABLE: ProviderErrorKind[] = [
  'offline',
  'timeout',
  'rate-limited',
  'server-error',
  'malformed-response',
];
const NOT_RETRYABLE: ProviderErrorKind[] = ['unauthorized', 'not-found'];

describe('describeError', () => {
  it.each(PROVIDER_ERROR_KINDS)('gives %s a friendly, non-technical message', (kind) => {
    const { title, message } = describeError(kind);
    expect(title.length).toBeGreaterThan(0);
    expect(message.length).toBeGreaterThan(0);
    expect(`${title} ${message}`).not.toMatch(
      /http|json|api|key|token|schema|429|401|404|500|exception/i,
    );
  });

  it('flags exactly the failures where trying again can help as retryable', () => {
    for (const kind of RETRYABLE) expect(describeError(kind).retryable).toBe(true);
    for (const kind of NOT_RETRYABLE) expect(describeError(kind).retryable).toBe(false);
  });

  it('gives each kind a distinct title', () => {
    const titles = PROVIDER_ERROR_KINDS.map((kind) => describeError(kind).title);
    expect(new Set(titles).size).toBe(titles.length);
  });
});

describe('ErrorState', () => {
  it.each(RETRYABLE)('shows a retry button for %s and calls onRetry when pressed', async (kind) => {
    const onRetry = jest.fn();
    await render(<ErrorState kind={kind} onRetry={onRetry} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    await fireEvent.press(button);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each(NOT_RETRYABLE)('shows no retry button for %s', async (kind) => {
    await render(<ErrorState kind={kind} onRetry={jest.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows no retry button when no handler is supplied', async () => {
    await render(<ErrorState kind="offline" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('renders the title and message inside an alert region', async () => {
    await render(<ErrorState kind="offline" />);
    const { title, message } = describeError('offline');
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText(title)).toBeTruthy();
    expect(screen.getByText(message)).toBeTruthy();
  });

  it('makes the retry button at least 44 points tall', async () => {
    await render(<ErrorState kind="timeout" onRetry={jest.fn()} />);
    const button = screen.getByRole('button', { name: 'Try again' });
    expect(StyleSheet.flatten(button.props.style).minHeight).toBeGreaterThanOrEqual(44);
  });
});
