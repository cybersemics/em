import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import exportDefaultIdentifier from 'eslint-plugin-export-default-identifier'
import importPlugin from 'eslint-plugin-import'
import jsdoc from 'eslint-plugin-jsdoc'
import prettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const commonSettings = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
}

const commonPlugins = {
  'export-default-identifier': exportDefaultIdentifier,
  jsdoc,
  react,
  'react-refresh': reactRefresh,
  prettier,
  '@typescript-eslint': typescriptEslint,
  import: importPlugin,
  'react-hooks': reactHooks,
}

const commonRules = {
  'react-hooks/exhaustive-deps': 'error',
  'no-restricted-properties': [
    'error',
    {
      object: 'window',
      property: 'getSelection',
      message:
        'Please import the appropriate helper function from /src/device/selection.ts to access the browser selection. This is done to abstract the browser selection API from the rest of the codebase.',
    },
  ],
  'export-default-identifier/export-default-identifier': 'off',
  'jsdoc/require-jsdoc': [
    'error',
    {
      contexts: ['VariableDeclarator > ArrowFunctionExpression'],
      require: {
        ClassDeclaration: true,
        ClassExpression: true,
        FunctionDeclaration: true,
      },
    },
  ],
  'import/prefer-default-export': 'off',
  'jsdoc/check-alignment': 'error',
  'jsdoc/check-indentation': 'error',
  'jsdoc/check-syntax': 'error',
  'jsdoc/check-types': 'error',
  'jsdoc/implements-on-classes': 'error',
  'jsdoc/no-types': 'error',
  'jsdoc/check-tag-names': [
    'error',
    {
      definedTags: ['packageDocumentation', 'jest-environment'],
    },
  ],
  'jsdoc/require-description-complete-sentence': [
    'error',
    {
      abbreviations: ['e.g.', 'i.e.'],
    },
  ],
  'jsx-a11y/anchor-is-valid': 'off',
  'react/jsx-curly-spacing': 'error',
  'react/jsx-equals-spacing': 'error',
  'react/react-in-jsx-scope': 'off',
  'react/jsx-tag-spacing': ['error', { beforeSelfClosing: 'allow' }],
  'react/no-children-prop': 'off',
  'react/no-unescaped-entities': 'off',
  'react/prop-types': 'off',
  'prettier/prettier': 'error',
  'arrow-body-style': 'off',
  'prefer-arrow-callback': 'off',
}

export default [
  {
    ignores: [
      'node_modules/**',
      '**/styled-system/*',
      '**/ios/*',
      '**/android/**',
      '**/build/*',
      '**/docs/*',
      '**/functions/*',
      '**/scripts/*',
    ],
  },
  {
    languageOptions: {
      ...commonSettings,
    },
    plugins: {
      ...commonPlugins,
    },
    rules: {
      ...commonRules,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Overrides for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json', './server/tsconfig.json', './tsconfig.eslint.json'],
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs['eslint-recommended'].rules,
      ...typescriptEslint.configs.recommended.rules,
      semi: ['error', 'never'],
      'no-extra-parens': 'off',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      '@typescript-eslint/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'none',
          },
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/array-type': 'error',
      'jsx-quotes': ['error', 'prefer-single'],
      'react-refresh/only-export-components': 'error',
    },
  },
  // Overrides for specific folders
  {
    files: ['src/e2e/**', '**/__tests__/*'],
    rules: {
      'no-restricted-properties': 'off',
      'jsdoc/check-tag-names': 'off',
    },
  },
  {
    files: ['./src/**/*.ts', './src/**/*.tsx'],
    rules: {
      'jsdoc/check-tag-names': 'off', // Specific rule to turn off for TypeScript files
    },
  },
  {
    files: ['src/special-folder/**/*.js'],
    rules: {
      'react/prop-types': 'warn', // Example of overriding a specific rule for files in a folder
    },
  },
  {
    files: ['./src/e2e/**/*.ts'],
    rules: {
      'jsdoc/check-tag-names': 'off',
    },
  },
]
