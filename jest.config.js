/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // Resolves Reanimated/Worklets to their JS (non-native) implementations under Jest.
  resolver: 'react-native-reanimated/jest/resolver',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/tests/e2e/'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    'app/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/providers/fake/**',
  ],
  coverageThreshold: {
    // Overall floor: coverage must not decrease (raise these as coverage improves).
    global: { statements: 93, branches: 90, functions: 92, lines: 94 },
    // Constitution: new or changed domain logic >= 90% (lines and branches).
    './src/domain/': { lines: 90, branches: 90 },
    './src/providers/openweather/mappers.ts': { lines: 90, branches: 90 },
  },
};
