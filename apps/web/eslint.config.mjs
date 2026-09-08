import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'node_modules/**',
    '.turbo/**',
  ]),
  {
    rules: {
      // ── TypeScript ──
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // ── Imports ──
      'import/no-duplicates': 'error',
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
            'object',
            'type',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // ── React ──
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // `set-state-in-effect` (react-hooks v6) flags intentional idioms: mount
      // effects, prop/URL → editable-state sync, and fetch-in-effect. These are
      // valid here, so surface as warnings instead of failing the build.
      'react-hooks/set-state-in-effect': 'warn',
      // `incompatible-library` flags TanStack Table's useReactTable(), which
      // intentionally returns un-memoizable handles. React Compiler skips it
      // by design — this is expected, so don't surface it.
      'react-hooks/incompatible-library': 'off',
      'react/no-unescaped-entities': 'off',

      // ── General ──
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always', { null: 'ignore' }],
    },
  },
]);

export default eslintConfig;
