import panda from '@pandacss/eslint-plugin'
import stylisticTs from '@stylistic/eslint-plugin'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import exportDefaultIdentifier from 'eslint-plugin-export-default-identifier'
import importPlugin from 'eslint-plugin-import'
import jsdoc from 'eslint-plugin-jsdoc'
import prettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

const rules = {
  'no-irregular-whitespace': 2,
  'no-extra-semi': 2,
  'prefer-const': 2,
  'no-loop-func': 1,
  'no-useless-constructor': 1,
  'react/display-name': 2,
  'no-restricted-properties': [
    2,
    {
      object: 'window',
      property: 'getSelection',
      message:
        'Please import the appropriate helper function from /src/device/selection.ts to access the browser selection. This is done to abstract the browser selection API from the rest of the codebase.',
    },
  ],
  'export-default-identifier/export-default-identifier': 0,

  'import/prefer-default-export': [
    2,
    {
      // any: Any exporting file must contain a default export.
      // single: When there is only a single export from a module, prefer using default export over named export.
      target: 'any',
    },
  ],

  'jsdoc/check-alignment': 2,
  'jsdoc/check-indentation': 2,
  'jsdoc/check-syntax': 2,
  'jsdoc/check-types': 2,
  'jsdoc/implements-on-classes': 2,
  'jsdoc/no-types': 2,
  'jsdoc/no-undefined-types': 2,
  'jsdoc/check-tag-names': [
    2,
    {
      definedTags: ['packageDocumentation'],
    },
  ],
  'jsdoc/require-description-complete-sentence': [
    2,
    {
      abbreviations: ['e.g.', 'i.e.'],
    },
  ],
  'jsdoc/require-jsdoc': [
    2,
    {
      contexts: ['VariableDeclarator > ArrowFunctionExpression'],
      enableFixer: false,
      require: {
        ClassDeclaration: true,
        ClassExpression: true,
      },
    },
  ],
  // jsx-a11y
  'jsx-a11y/anchor-is-valid': 0,
  // react

  'react/jsx-curly-spacing': 2,
  'react/jsx-equals-spacing': 2,
  'react/react-in-jsx-scope': 0,
  'react/jsx-tag-spacing': [2, { beforeSelfClosing: 'allow' }],
  'react/no-children-prop': 0,
  'react/no-unescaped-entities': 0,
  'react/prop-types': 0,
  // react-hooks

  'react-hooks/exhaustive-deps': 2,
  // prettier

  'prettier/prettier': 2,
  'arrow-body-style': 0,
  'prefer-arrow-callback': 0,
}

export default [
  {
    ignores: [
      'node_modules/**',
      'packages',
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
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
    },
    plugins: {
      '@stylistic/ts': stylisticTs,
      'export-default-identifier': exportDefaultIdentifier,
      jsdoc,
      react,
      'react-refresh': reactRefresh,
      prettier,
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      'react-hooks': reactHooks,
      '@pandacss': panda,
    },
    rules,
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  // Overrides for specific folders
  {
    files: ['src/e2e/**', '**/__tests__/*'],
    rules: {
      'no-restricted-properties': 0,
      'jsdoc/check-tag-names': 0,
    },
  },
  // Overrides for TypeScript files
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: ['./tsconfig.json', './tsconfig.eslint.json'],
      },
    },
    plugins: {
      '@typescript-eslint': typescriptEslint,
    },
    rules: {
      ...typescriptEslint.configs['eslint-recommended'].rules,
      ...typescriptEslint.configs.recommended.rules,
      semi: [2, 'never'],
      'no-extra-parens': 0,
      'no-unused-vars': 0,
      'no-use-before-define': 0,
      '@stylistic/ts/member-delimiter-style': [
        2,
        {
          multiline: {
            delimiter: 'none',
          },
        },
      ],
      '@typescript-eslint/no-var-requires': 2,
      '@typescript-eslint/no-require-imports': 0,
      '@typescript-eslint/no-explicit-any': 0,
      '@typescript-eslint/prefer-namespace-keyword': 2,
      '@typescript-eslint/no-non-null-assertion': 0,
      '@typescript-eslint/no-use-before-define': 2,
      '@typescript-eslint/no-unused-vars': [2, { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 0,
      '@typescript-eslint/explicit-module-boundary-types': 0,
      '@typescript-eslint/array-type': 2,
      // jsx

      'jsx-quotes': [2, 'prefer-single'],
      // react-refresh

      'react-refresh/only-export-components': 2,
      // pandacss

      ...panda.configs.recommended.rules,
      '@pandacss/no-config-function-in-source': 0,
      '@pandacss/prefer-longhand-properties': 2,
      '@pandacss/no-dynamic-styling': 0,
      '@pandacss/no-hardcoded-color': 2,
      '@pandacss/no-property-renaming': 2,
    },
  },

  {
    files: ['./src/**/*.ts', './src/**/*.tsx'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },
  },
  {
    files: ['./src/e2e/**/*.ts'],
    rules: {
      'jsdoc/check-tag-names': 0,
    },
  },
]
