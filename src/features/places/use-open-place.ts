import { useRouter } from 'expo-router';
import { useCallback } from 'react';

import { CURRENT_PLACE_ID } from '@/domain/place';
import type { Place } from '@/domain/types';
import { usePreferences } from '@/features/settings/use-preferences';

import { usePlaces } from './use-places';

/**
 * Makes a place the one shown on the weather screen and navigates back to it.
 * Pass null to switch back to the device location.
 */
export function useOpenPlace(): (place: Place | null) => Promise<void> {
  const router = useRouter();
  const { setViewed } = usePlaces();
  const { update } = usePreferences();

  return useCallback(
    async (place) => {
      if (place) {
        await setViewed(place);
        await update({ lastViewedPlaceId: place.id });
      } else {
        await update({ lastViewedPlaceId: CURRENT_PLACE_ID });
      }
      if (router.canGoBack()) router.back();
      else router.replace('/');
    },
    [router, setViewed, update],
  );
}
