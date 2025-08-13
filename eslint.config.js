import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  // Type-aware rules for source files
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        setTimeout: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
    },
    rules: {
      ...typescript.configs['recommended'].rules,
      ...typescript.configs['recommended-requiring-type-checking'].rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },
  // Non type-aware rules for Nx plugin files to avoid requiring nx/devkit types
        {
        files: ['plugin/**/*.ts', 'plugin/**/*.tsx'],
        ignores: ['plugin/**/*.js'],
        languageOptions: {
          parser: typescriptParser,
          parserOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
          },
          globals: {
            console: 'readonly',
            process: 'readonly',
          },
        },
        plugins: {
          '@typescript-eslint': typescript,
          prettier: prettier,
        },
        rules: {
          ...typescript.configs['recommended'].rules,
          ...prettierConfig.rules,
          'prettier/prettier': 'error',
          '@typescript-eslint/no-explicit-any': 'warn',
          '@typescript-eslint/no-unused-vars': ['error', {
            argsIgnorePattern: '^_',
            varsIgnorePattern: '^_',
          }],
        },
      },
  {
    ignores: ['dist/**', 'node_modules/**', '.pnpm-store/**', 'plugin/**/*.js'],
  },
];