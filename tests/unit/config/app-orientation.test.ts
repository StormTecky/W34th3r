import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { expo } = JSON.parse(readFileSync(resolve(__dirname, '../../../app.json'), 'utf8'));

describe('orientation', () => {
  it('lets every screen turn with the device', () => {
    expect(expo.orientation).toBe('default');
  });

  it('runs at full size on iPad', () => {
    expect(expo.ios.supportsTablet).toBe(true);
  });
});
