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

const commonSettings = {
  ecmaVersion: 'latest',
  sourceType: 'module',
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
}

const commonPlugins = {
  '@stylistic/ts': stylisticTs,
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
  'no-irregular-whitespace': 'error',
  'no-extra-semi': 'error',
  'prefer-const': 'error',
  'no-loop-func': 'warn',
  'no-useless-constructor': 'warn',
  'react/display-name': 'error',
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

  'import/prefer-default-export': [
    'error',
    {
      // any: Any exporting file must contain a default export.
      // single: When there is only a single export from a module, prefer using default export over named export.
      target: 'any',
    },
  ],

  'jsdoc/check-alignment': 'error',
  'jsdoc/check-indentation': 'error',
  'jsdoc/check-syntax': 'error',
  'jsdoc/check-types': 'error',
  'jsdoc/implements-on-classes': 'error',
  'jsdoc/no-types': 'error',
  // Disable until performance issue is solved.
  // https://github.com/gajus/eslint-plugin-jsdoc/issues/1334
  // 'jsdoc/no-undefined-types': 2,
  'jsdoc/check-tag-names': [
    'error',
    {
      definedTags: ['packageDocumentation'],
    },
  ],
  'jsdoc/require-description-complete-sentence': [
    'error',
    {
      abbreviations: ['e.g.', 'i.e.'],
    },
  ],
  'jsdoc/require-jsdoc': [
    'error',
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
  'jsx-a11y/anchor-is-valid': 'off',
  // react

  'react/jsx-curly-spacing': 'error',
  'react/jsx-equals-spacing': 'error',
  'react/react-in-jsx-scope': 'off',
  'react/jsx-tag-spacing': ['error', { beforeSelfClosing: 'allow' }],
  'react/no-children-prop': 'off',
  'react/no-unescaped-entities': 'off',
  'react/prop-types': 'off',
  // react-hooks

  'react-hooks/exhaustive-deps': 'error',
  // prettier

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
  // Overrides for specific folders
  {
    files: ['src/e2e/**', '**/__tests__/*'],
    rules: {
      'no-restricted-properties': 'off',
      'jsdoc/check-tag-names': 'off',
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
      semi: ['error', 'never'],
      'no-extra-parens': 'off',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      '@stylistic/ts/member-delimiter-style': [
        'error',
        {
          multiline: {
            delimiter: 'none',
          },
        },
      ],
      '@typescript-eslint/no-var-requires': 'error',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/prefer-namespace-keyword': 'error',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-use-before-define': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/array-type': 'error',
      // jsx

      'jsx-quotes': ['error', 'prefer-single'],
      // react-refresh

      'react-refresh/only-export-components': 'error',
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
      'jsdoc/check-tag-names': 'off',
    },
  },
]
