import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs,cjs}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
        global: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Prefer const for immutability
      'prefer-const': 'error',
      // Stricter unused variables detection
      'no-unused-vars': 'off', // Turn off base rule
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      // Additional quality rules
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
    },
  },
  // Stricter console rules for core library - no console statements allowed
  {
    files: ['packages/core/**/*.{ts,tsx}'],
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  // Allow console statements in logger implementations and user-facing output
  {
    files: [
      'packages/cli/**/*.{ts,tsx}',
      'packages/create-stati/**/*.{ts,tsx}',
      'packages/core/src/core/dev.ts', // Default logger implementations
      'packages/core/src/core/build.ts', // Default logger implementations
      'scripts/**/*.{js,mjs,cjs}',
    ],
    rules: {
      'no-console': 'off',
    },
  },
  // More restrictive for tests - only error/warn allowed
  {
    files: ['**/*.test.{ts,tsx,js}', '**/__tests__/**/*.{ts,tsx,js}'],
    rules: {
      'no-console': ['error', { allow: ['error', 'warn'] }],
    },
  },
  {
    ignores: [
      '**/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      '**/*.tsbuildinfo',
    ],
  },
];
