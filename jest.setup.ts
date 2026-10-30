import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

import { configure } from '@testing-library/react-native';

import { PHONE, setWindowSize } from './tests/helpers/screen-size';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Screens draw illustrated scenes, so a render can take longer than the 1 s default under load.
configure({ asyncUtilTimeout: 4000 });

// Navigation is exercised through the shared mock router: tests assert on its calls instead of
// mounting a navigator. Reach it with `jest.requireMock('expo-router').router`.
jest.mock('expo-router', () => {
  const router = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
    dismissTo: jest.fn(),
    canGoBack: jest.fn(() => true),
  };
  const Stack = Object.assign(() => null, { Screen: () => null });
  return {
    router,
    Stack,
    useRouter: () => router,
    useLocalSearchParams: jest.fn(() => ({})),
  };
});

// Every test starts on a phone held upright, with empty storage and a clean router, so state
// cannot leak between tests. (The default Jest window is 750 points wide, a tablet layout.)
beforeEach(async () => {
  setWindowSize(PHONE);
  await mockAsyncStorage.clear();
  const { router } = jest.requireMock('expo-router');
  for (const fn of Object.values(router) as jest.Mock[]) fn.mockClear();
});
