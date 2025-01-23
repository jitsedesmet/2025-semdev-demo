// eslint-disable-next-line import/no-nodejs-modules
import path from 'node:path';
// eslint-disable-next-line import/no-nodejs-modules
import { fileURLToPath } from 'node:url';
import config from '@rubensworks/eslint-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default config([
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    rules: {
      // Default
      'unicorn/consistent-destructuring': 'off',
      'unicorn/no-array-callback-reference': 'off',
      'unicorn/no-useless-undefined': [
        'error',
        { checkArguments: false },
      ],

      // TODO: check if these can be enabled
      'ts/naming-convention': 'off',
      'ts/no-unsafe-return': 'off',
      'ts/no-unsafe-argument': 'off',
      'ts/no-unsafe-assignment': 'off',

      'ts/no-require-imports': [ 'error', { allow: [
        'process/',
        'is-stream',
        'readable-stream-node-to-web',
      ]}],
      'ts/no-var-requires': [ 'error', { allow: [
        'process/',
        'is-stream',
        'readable-stream-node-to-web',
      ]}],
    },
  },
  {
    // Specific rules for NodeJS-specific files
    files: [
      '**/test/**/*.ts',
      '**/__mocks__/*.js',
      'packages/actor-dereference-file/**/*.ts',
      'packages/actor-http-native/**/*.ts',
      'packages/logger-bunyan/**/*.ts',
      'packages/packager/**/*.ts',
    ],
    rules: {
      'import/no-nodejs-modules': 'off',
      'ts/no-require-imports': 'off',
      'ts/no-var-requires': 'off',
    },
  },
  // {
  //   // Some test files import 'jest-rdf' which triggers this
  //   // Some jest tests import '../../lib' which triggers this
  //   files: [
  //     '**/test/*-test.ts',
  //     '**/test/*-util.ts',
  //     'packages/jest/test/matchers/*-test.ts',
  //   ],
  //   rules: {
  //     'import/no-unassigned-import': 'off',
  //   },
  // },
  // {
    // Spec test engines
  //   files: [
  //     '**/spec/*.js',
  //   ],
  //   rules: {
  //     'import/extensions': 'off',
  //     'ts/no-var-requires': 'off',
  //     'ts/no-require-imports': 'off',
  //     'import/no-extraneous-dependencies': 'off',
  //   },
  // },
  // {
  //   files: [
  //     'eslint.config.js',
  //   ],
  //   rules: {
  //     'ts/no-var-requires': 'off',
  //     'ts/no-require-imports': 'off',
  //   },
  // },
  {
    ignores: [
      // The engine bundles are auto-generated code
      'engines/*/engine-default.js',
      'engines/*/engine-browser.js',
      'engines/*/comunica-browser.js',
      // The performance combination files are auto-generated
      'performance/*/combinations/**',
      // TODO: Remove this once solid-client-authn supports node 18.
      'engines/query-sparql/test/QuerySparql-solid-test.ts',
      // Dev-only files that are not checked in
      '**/bintest/**',
      '**/componentsjs-error-state.json',
    ],
  },
], { disableJest: false });
