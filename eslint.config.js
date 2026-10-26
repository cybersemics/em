import panda, { Inspector, Linter } from '@pandacss/eslint-plugin'
import stylistic from '@stylistic/eslint-plugin'
import typescriptEslint from '@typescript-eslint/eslint-plugin'
import typescriptParser from '@typescript-eslint/parser'
import exportDefaultIdentifier from 'eslint-plugin-export-default-identifier'
import importPlugin from 'eslint-plugin-import'
import jsdoc from 'eslint-plugin-jsdoc'
import prettier from 'eslint-plugin-prettier'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import em from './packages/eslint-plugin-em/index.js'
import inlinePreloadImageCalls from './src/panda-plugins/inlinePreloadImageCalls.js'

/**
 * Lets the PandaCSS lint rules understand preloadImage().
 *
 * PandaCSS decides which CSS to generate by reading the css() calls in the source without running them, so it cannot
 * know what a function call such as css({ backgroundImage: preloadImage('/img/glow.avif') }) returns. For the build,
 * src/panda-plugins/preloadImagePlugin.ts gets round this by rewriting each preloadImage() call to the url() string it
 * returns before PandaCSS reads the file. The PandaCSS lint rules read css() calls the same way, to warn about styles
 * that will get no CSS, but they do not run that plugin. Without this class they would warn about every image set with
 * preloadImage(), even though the build generates its CSS.
 *
 * An Inspector is the part of the lint rules that hands each file to PandaCSS, so this one applies the same rewrite
 * first. Only what PandaCSS reads changes; the rest of ESLint sees the original file, and reported lines and columns
 * still match it.
 */
class PreloadImageInspector extends Inspector {
  /** Hands PandaCSS the file with each preloadImage() call rewritten to the url() it returns. */
  inspect(compiler, path, source) {
    return super.inspect(compiler, path, inlinePreloadImageCalls(source) ?? source)
  }
}

// The Panda plugin lints against the tokens, recipes, and utilities in panda.config.ts, so it loads the config up front.
const pandaConfig = await panda.configs.recommended({
  configPath: './panda.config.ts',
  linter: new Linter({ inspector: new PreloadImageInspector() }),
})

// Matches a variable spread directly into a css(), css.raw(), cva() or sva() style object, or into an object nested in it
// by property (e.g. under a condition or a selector). Spreads inside a callback in the call (e.g. a reduce that builds
// variants) are not matched.
const pandaVariableSpreadSelector = [0, 1, 2, 3]
  .map(
    depth =>
      'CallExpression:matches([callee.name=/^(css|cva|sva)$/], [callee.object.name=/^(css|cva|sva)$/][callee.property.name="raw"]) > ObjectExpression' +
      ' > Property > ObjectExpression'.repeat(depth) +
      ' > SpreadElement[argument.type=/^(Identifier|MemberExpression)$/]',
  )
  .join(', ')

const rules = {
  'no-irregular-whitespace': 2,
  'no-extra-semi': 2,
  'prefer-const': 2,
  'no-loop-func': 1,
  'no-useless-constructor': 1,
  'react/display-name': 2,
  'no-restricted-globals': [
    2,
    {
      name: 'localStorage',
      message:
        "Use the storage abstraction (import storage from '../util/storage') instead of accessing localStorage directly. This ensures cross-platform compatibility.",
    },
  ],
  'no-restricted-syntax': [
    2,
    {
      selector: 'MemberExpression[object.name="expect"][property.name="poll"]',
      message:
        'expect.poll runs its callback in node, so every attempt is a devtools round trip on an interval. Wait in the page with page.waitForFunction (or a waitFor* helper) instead, which polls on every animation frame for a fixed handful of protocol messages. To report the value that was actually rendered, catch the wait and read it once — see docs/testing.md § Never wait for wall-clock time.',
    },
    {
      selector: 'MemberExpression[object.name="vi"][property.name=/^(waitFor|waitUntil)$/]',
      message:
        'vi.waitFor polls on a real-time interval. In store and JSDOM tests, initStore and createTestApp already enable fake timers, so flush them instead — await vi.runAllTimersAsync() (wrapped in act when it causes React updates), then assert — which settles the work in one step and fails immediately rather than after the poll timeout. In Puppeteer, wait in the page with page.waitForFunction or a waitFor* helper. See docs/testing.md § Never wait for wall-clock time.',
    },
    {
      selector: pandaVariableSpreadSelector,
      message:
        'PandaCSS v2 does not generate CSS for a variable spread into a style object when the variable holds a conditional (e.g. `const styles = flag ? { ... } : {}`), and it fails silently: the class name is applied but no rule exists. Give each property its own ternary (`border: flag ? "1px solid" : undefined`) or spread the object literal inline (`...(flag ? { ... } : {})`). See .github/instructions/code-standards.instructions.md § CSS.',
    },
    {
      selector: [
        'Property[key.name="background"] > Literal[value=/url\\(/]',
        'Property[key.name="background"] > TemplateLiteral > TemplateElement[value.raw=/url\\(/]',
        'JSXAttribute[name.name="style"] Property[key.name="backgroundImage"] > Literal[value=/url\\(/]',
        'JSXAttribute[name.name="style"] Property[key.name="backgroundImage"] > TemplateLiteral > TemplateElement[value.raw=/url\\(/]',
      ].join(', '),
      message:
        "Set an image with css({ backgroundImage: preloadImage('/img/...') }), so that it is preloaded. backgroundImage in css() only accepts a preloaded image, but the background shorthand and inline styles are not type-checked. For an image chosen at runtime, make an object of css() classes keyed by the runtime value. See src/util/preloadImage.ts.",
    },
    {
      // The type of backgroundImage already rejects this, but TypeScript can only say that the string is not assignable
      // to a long union, so this says what to do instead. Recipes are not matched, as they keep a plain url().
      selector: [
        ':matches(CallExpression[callee.name="css"], CallExpression[callee.object.name="css"]) Property[key.name="backgroundImage"] > Literal[value=/url\\(/]',
        ':matches(CallExpression[callee.name="css"], CallExpression[callee.object.name="css"]) Property[key.name="backgroundImage"] > TemplateLiteral > TemplateElement[value.raw=/url\\(/]',
      ].join(', '),
      message:
        "Set an image with backgroundImage: preloadImage('/img/...'), so that it is decoded before it is shown. To show an image without preloading it, cast it: 'url(/img/...)' as PreloadedImageUrl – though note in most cases you should not need to bypass this. See src/util/preloadImage.ts.",
    },
    {
      selector: 'CallExpression[callee.name="preloadImage"]:not([arguments.0.type="Literal"])',
      message:
        'Pass preloadImage a string literal. PandaCSS reads the path through a plugin that only recognizes a literal, so a computed path gets no CSS and fails silently. For an image chosen at runtime, make an object of css() classes keyed by the runtime value. See src/util/preloadImage.ts.',
    },
  ],
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
  'jsx-a11y/anchor-is-valid': 0,
  '@stylistic/jsx-curly-spacing': 2,
  '@stylistic/jsx-equals-spacing': 2,
  'react/react-in-jsx-scope': 0,
  '@stylistic/jsx-tag-spacing': [2, { beforeSelfClosing: 'allow' }],
  'react/no-children-prop': 0,
  'react/no-unescaped-entities': 0,
  'react/prop-types': 0,
  'react-hooks/exhaustive-deps': 2,
  'prettier/prettier': 2,
  'arrow-body-style': 0,
  'prefer-arrow-callback': 0,
  'em/no-direct-durations-config-import': 2,
  'em/ministore-store-suffix': 2,
  'em/no-precomputed-debug-log-fields': 2,
}

export default [
  {
    ignores: [
      'node_modules/**',
      '.claude/worktrees/**',
      'packages/**/dist/**/*',
      'packages/**/.build/**/*',
      '**/styled-system/*',
      '**/ios/*',
      // The Capacitor project at the repo root, anchored so that src/e2e/android is still linted.
      'android/**',
      '**/desktop/**',
      '**/build/*',
      '**/docs/*',
      '**/functions/*',
      'public/wa-sqlite/**',
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
      '@stylistic': stylistic,
      '@stylistic/ts': stylistic,
      'export-default-identifier': exportDefaultIdentifier,
      jsdoc,
      react,
      'react-refresh': reactRefresh,
      prettier,
      '@typescript-eslint': typescriptEslint,
      import: importPlugin,
      'react-hooks': reactHooks,
      '@pandacss': pandaConfig.plugins['@pandacss'],
      em,
    },
    rules,
    settings: {
      react: {
        version: '19',
      },
    },
  },
  // Overrides for specific folders
  {
    files: ['src/e2e/**', '**/__tests__/*'],
    rules: {
      'no-restricted-globals': 0,
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
      '@typescript-eslint/no-explicit-any': 2,
      '@typescript-eslint/prefer-namespace-keyword': 2,
      '@typescript-eslint/no-non-null-assertion': 0,
      '@typescript-eslint/no-use-before-define': 2,
      '@typescript-eslint/no-unused-vars': [2, { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 0,
      '@typescript-eslint/explicit-module-boundary-types': 0,
      '@typescript-eslint/array-type': 2,
      'jsx-quotes': [2, 'prefer-single'],
      'react-refresh/only-export-components': 2,
      'em/no-store-subscribe-in-components': 2,
      ...pandaConfig.rules,
      '@pandacss/consistent-property-style': [2, { style: 'longhand' }],
      '@pandacss/prefer-token': [
        2,
        {
          categories: ['colors'],
          allow: ['inherit', 'currentColor'],
        },
      ],
      '@typescript-eslint/return-await': ['error', 'in-try-catch'],
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
  // The WebdriverIO tests (iOS and Android) are typechecked by their own tsconfigs, the only programs that declare
  // WebdriverIO's globals (browser, $, expect) and @wdio/browserstack-service's global interfaces. The root
  // tsconfig excludes src/e2e/iOS and src/e2e/android, so type-aware linting of those files has to use theirs.
  {
    files: ['./src/e2e/iOS/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './src/e2e/iOS/tsconfig.json',
      },
    },
  },
  {
    files: ['./src/e2e/android/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './src/e2e/android/tsconfig.json',
      },
    },
  },
  {
    files: ['./src/e2e/**/*.ts'],
    rules: {
      'jsdoc/check-tag-names': 0,
    },
  },
  // Allow direct localStorage access only in the storage abstraction layer
  {
    files: ['./src/util/storage.ts'],
    rules: {
      'no-restricted-globals': 0,
    },
  },
  // actions/github-script evaluates its `script:` body in a CommonJS context and resolves relative
  // require() paths against the workspace, so the scripts it loads must be CommonJS. package.json
  // sets "type": "module", hence the .cjs extension.
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        __dirname: 'readonly',
        __filename: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
  },
  // A constants module is a collection of peer values with no primary export, so there is no
  // meaningful default export to prefer. Named exports keep them individually tree-shakeable and
  // importable by name.
  {
    files: ['**/constants.ts'],
    rules: {
      'import/prefer-default-export': 0,
    },
  },
]
