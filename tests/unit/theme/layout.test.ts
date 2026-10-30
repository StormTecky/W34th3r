import { layoutFor } from '@/theme/layout';
import { layout } from '@/theme/tokens';

import { PHONE, PHONE_LANDSCAPE, TABLET } from '../../helpers/screen-size';

describe('layoutFor', () => {
  it('keeps one column on a phone held upright, with the full-size scene', () => {
    expect(layoutFor(PHONE)).toEqual({ wide: false, sceneSize: layout.maxScene });
  });

  it('shrinks the scene to fit a narrow phone', () => {
    expect(layoutFor({ width: 320, height: 568 }).sceneSize).toBe(272);
  });

  it('goes wide from the breakpoint on', () => {
    expect(layoutFor({ width: layout.wideFrom - 1, height: 900 }).wide).toBe(false);
    expect(layoutFor({ width: layout.wideFrom, height: 900 }).wide).toBe(true);
  });

  it('goes wide on a tablet held either way', () => {
    expect(layoutFor(TABLET).wide).toBe(true);
    expect(layoutFor({ width: TABLET.height, height: TABLET.width }).wide).toBe(true);
    expect(layoutFor(TABLET).sceneSize).toBe(layout.maxScene);
  });

  it('on a phone on its side, shrinks the scene so the temperature still fits under it', () => {
    const { wide, sceneSize } = layoutFor(PHONE_LANDSCAPE);
    expect(wide).toBe(true);
    expect(sceneSize).toBeCloseTo(PHONE_LANDSCAPE.height * layout.sceneHeightShare, 5);
  });

  it('fits the scene inside one of two columns when the height allows more', () => {
    // 640 wide: (640 - 2 × 16 margin - 24 gap) / 2 = 292, less 2 × 24 padding.
    expect(layoutFor({ width: 640, height: 2000 }).sceneSize).toBe(244);
  });
});
