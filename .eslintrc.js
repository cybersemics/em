module.exports = {
  env: {
    browser: true,
    es6: true,
    mocha: true,
    jest: true
  },
  extends: [
    'standard',
    'react-app',
    'plugin:react/recommended',
    'plugin:import/typescript',
    'raine'
  ],
  ignorePatterns: 'scripts',
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      env: {
        browser: true,
        es6: true,
        node: true
      },
      extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended'
      ],
      globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json'
      },
      plugins: ['@typescript-eslint'],
      rules: {
        'import/prefer-default-export': 0,
        // temporary fix from 'typescript-eslint' docs
        // https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules/no-unused-vars.md
        'no-extra-parens': 0,
        'no-unused-vars': 0,
        'no-use-before-define': 0,
        '@typescript-eslint/member-delimiter-style': [2,
          {
            multiline: {
              delimiter: 'comma'
            },
            singleline: {
              delimiter: 'comma'
            }
          }
        ],
        '@typescript-eslint/no-explicit-any': 0,
        '@typescript-eslint/no-extra-parens': [2,
          'all',
          {
            nestedBinaryExpressions: false
          }
        ],
        '@typescript-eslint/no-non-null-assertion': 0,
        '@typescript-eslint/no-use-before-define': 2,
        '@typescript-eslint/no-unused-vars': 2,
        '@typescript-eslint/explicit-function-return-type': 0,
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/array-type': [2,
          {
            'array-type': 'array'
          }
        ],
        // jsx
        'jsx-quotes': [2,
          'prefer-single'
        ]
      },
      settings: { react: { version: 'detect' } }
    }
  ],
  // to be removed later
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 2018,
    sourceType: 'module',
    project: './tsconfig.json'
  },
  plugins: [
    'export-default-identifier',
    'fp',
    'jsdoc',
    'react'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  rules: {

    // export-default-identifier
    'export-default-identifier/export-default-identifier': [2,
      {
        types: ['Identifier', 'CallExpression', 'FunctionDeclaration']
      }
    ],

    // jsdoc
    'jsdoc/check-tag-names': [2,
      {
        definedTags: ['packageDocumentation']
      }
    ],
    'jsdoc/require-description-complete-sentence': [2,
      {
        abbreviations: ['e.g.', 'i.e.']
      }
    ],
    'jsdoc/require-jsdoc': [2,
      {
        contexts: [
          'VariableDeclarator > ArrowFunctionExpression'
        ],
        require: {
          ClassDeclaration: true,
          ClassExpression: true
        }
      }
    ],

    // jsx-a11y
    'jsx-a11y/anchor-is-valid': 0,

    // react
    'react/jsx-curly-spacing': 2,
    'react/jsx-equals-spacing': 2,
    'react/jsx-tag-spacing': [2,
      {
        beforeSelfClosing: 'allow'
      }
    ],
    'react/no-children-prop': 0,
    'react/no-unescaped-entities': 0,
    'react/prop-types': 0,

    // react-hooks
    'react-hooks/exhaustive-deps': 0

  }
}
