import { useMemo, useState } from 'react';

import type { WeatherSnapshot } from '@/domain/types';
import { useNowSeconds } from '@/lib/use-now';

import { AlertBanner } from './AlertBanner';
import { AlertSheet } from './AlertSheet';
import { sortAlerts } from './details-view-model';

/** Banner for the most severe alert, opening the full text of all alerts on demand. */
export function AlertsSection({ snapshot }: { snapshot: WeatherSnapshot }) {
  const [open, setOpen] = useState(false);
  const now = useNowSeconds();
  const alerts = useMemo(() => sortAlerts(snapshot.alerts), [snapshot.alerts]);
  if (alerts.length === 0) return null;

  return (
    <>
      <AlertBanner alerts={alerts} onPress={() => setOpen(true)} />
      <AlertSheet
        visible={open}
        alerts={alerts}
        timeZone={snapshot.timeZone}
        timeZoneOffset={snapshot.timeZoneOffset}
        now={now}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
