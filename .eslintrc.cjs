module.exports = {
  env: {
    browser: true,
    es6: true,
    mocha: true,
    jest: true,
  },
  extends: ['react-app', 'plugin:react/recommended', 'plugin:import/typescript', 'prettier'],
  // to be removed later
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  plugins: ['export-default-identifier', 'jsdoc', 'react', 'react-refresh', 'prettier'],
  settings: {
    react: {
      version: 'detect',
    },
  },
  rules: {
    // export-default-identifier
    'export-default-identifier/export-default-identifier': [
      2,
      {
        types: ['Identifier', 'CallExpression', 'FunctionDeclaration'],
      },
    ],

    // import/prefer-default-export
    'import/prefer-default-export': [
      2,
      {
        // any: Any exporting file must contain a default export.
        // single: When there is only a single export from a module, prefer using default export over named export.
        target: 'any',
      },
    ],

    // jsdoc
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
    'react/jsx-tag-spacing': [
      2,
      {
        beforeSelfClosing: 'allow',
      },
    ],
    'react/no-children-prop': 0,
    'react/no-unescaped-entities': 0,
    'react/prop-types': 0,

    // react-hooks
    'react-hooks/exhaustive-deps': 2,

    // prettier
    'prettier/prettier': 2,
    'arrow-body-style': 0,
    'prefer-arrow-callback': 0,
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      env: {
        browser: true,
        es6: true,
        node: true,
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
      ],
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
      },
      plugins: ['@typescript-eslint'],
      settings: { react: { version: 'detect' } },
      rules: {
        semi: ['error', 'never'],
        // temporary fix from 'typescript-eslint' docs
        // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-vars.md
        'no-extra-parens': 0,
        'no-unused-vars': 0,
        'no-use-before-define': 0,
        '@typescript-eslint/member-delimiter-style': [
          2,
          {
            multiline: {
              delimiter: 'none',
            },
          },
        ],
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-use-before-define': 2,
        '@typescript-eslint/no-unused-vars': 2,
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/array-type': 2,
        // jsx
        'jsx-quotes': [2, 'prefer-single'],
        // react-refresh
        'react-refresh/only-export-components': 2,
      },
      overrides: [
        {
          files: ['./src/**/*.ts', './src/**/*.tsx'],
          parser: '@typescript-eslint/parser',
          parserOptions: {
            ecmaFeatures: { jsx: true },
            ecmaVersion: 2018,
            sourceType: 'module',
            project: './tsconfig.json',
          },
        },
        {
          files: ['./src/e2e/**/*.ts'],
          rules: {
            'jsdoc/check-tag-names': 0,
          },
        },
      ],
    },
  ],
}
