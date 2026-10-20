const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const a11y = require('eslint-plugin-react-native-a11y');

module.exports = defineConfig([
  globalIgnores(['node_modules/', 'dist/', 'build/', 'coverage/', '.expo/', 'ios/', 'android/']),
  expoConfig,
  {
    plugins: { 'react-native-a11y': a11y },
    rules: {
      ...a11y.configs.all.rules,
      // Hints are only for actions whose result is not obvious from the label; requiring them
      // everywhere makes screen-reader output noisier, not better.
      'react-native-a11y/has-accessibility-hint': 'off',
      complexity: ['warn', 10],
      'max-lines-per-function': ['warn', { max: 40, skipBlankLines: true, skipComments: true }],
      'no-console': 'error',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/ban-ts-comment': [
        'error',
        {
          'ts-expect-error': 'allow-with-description',
          'ts-ignore': true,
          minimumDescriptionLength: 10,
        },
      ],
    },
  },
  {
    files: ['src/lib/logger.ts', 'scripts/**'],
    rules: { 'no-console': 'off' },
  },
  {
    // Test files are exempt from size limits: describe() blocks are long by nature.
    files: ['tests/**'],
    rules: { 'max-lines-per-function': 'off', 'no-console': 'off' },
  },
]);
