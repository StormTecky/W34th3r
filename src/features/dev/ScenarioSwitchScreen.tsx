import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';

import { FakeWeatherProvider } from '@/providers/fake/fake-provider';
import { FAKE_SCENARIOS, type FakeScenario } from '@/providers/fake/scenarios';
import { useWeatherProvider } from '@/providers/provider-context';

const isScenario = (name: unknown): name is FakeScenario =>
  typeof name === 'string' && (FAKE_SCENARIOS as readonly string[]).includes(name);

/**
 * Test hook for end-to-end flows: `w34th3r://dev/scenario?name=offline` switches the fake provider
 * to that scenario and returns to the weather screen. It affects only fake-provider builds (a real
 * provider ignores it) and renders nothing.
 */
export function ScenarioSwitchScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const provider = useWeatherProvider();
  const router = useRouter();

  useEffect(() => {
    if (provider instanceof FakeWeatherProvider && isScenario(name)) provider.setScenario(name);
    router.replace('/');
  }, [provider, name, router]);

  return null;
}
