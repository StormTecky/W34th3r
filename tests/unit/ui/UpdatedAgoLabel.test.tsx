import { render, screen } from '@testing-library/react-native';

import { UpdatedAgoLabel } from '@/ui/UpdatedAgoLabel';

const FETCHED = 1_800_000_000;

describe('UpdatedAgoLabel', () => {
  it('shows nothing while the data is fresh (15 minutes or less)', async () => {
    await render(<UpdatedAgoLabel fetchedAt={FETCHED} now={FETCHED + 15 * 60} />);
    expect(screen.queryByText(/Updated/)).toBeNull();
  });

  it('shows the age once the data is stale', async () => {
    await render(<UpdatedAgoLabel fetchedAt={FETCHED} now={FETCHED + 20 * 60} />);
    expect(screen.getByText('Updated 20 min ago')).toBeTruthy();
  });

  it('uses hours and days for older data', async () => {
    const { rerender } = await render(
      <UpdatedAgoLabel fetchedAt={FETCHED} now={FETCHED + 3 * 3600} />,
    );
    expect(screen.getByText('Updated 3 h ago')).toBeTruthy();
    await rerender(<UpdatedAgoLabel fetchedAt={FETCHED} now={FETCHED + 2 * 86_400} />);
    expect(screen.getByText('Updated 2 d ago')).toBeTruthy();
  });

  it('can be forced visible for data the app knows is out of date', async () => {
    await render(<UpdatedAgoLabel fetchedAt={FETCHED} now={FETCHED + 60} always />);
    expect(screen.getByText('Updated 1 min ago')).toBeTruthy();
  });

  it('exposes the text to screen readers', async () => {
    await render(<UpdatedAgoLabel fetchedAt={FETCHED} now={FETCHED + 30 * 60} />);
    expect(screen.getByLabelText('Updated 30 min ago')).toBeTruthy();
  });
});
