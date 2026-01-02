This is a Typescript/React/Redux web app that runs as a PWA on mobile.

Background: https://github.com/cybersemics/em/wiki/Docs

## Setup and Development

### Installation

- Run `yarn` to install dependencies.
- Postinstall automatically runs `yarn build:packages` and `yarn build:styles`.

### Development Server

- Run `yarn start` to start the Vite dev server on port 3000.

### Build

- Run `yarn build` to build the project (builds packages, styles, and Vite bundle).

## Code Standards

### Files, modules, and exports

- Do not create new files for constants, hooks, components, selectors, or helper functions that are only used in a single file. Instead, define them in the same file where they are used.
- Only a single, default export is allowed. Named exports are not allowed.
  - Exception: action-creators are co-located with reducers in `src/actions` and exported as named exports.
- Filename should exactly match the default export name.

### Required Before Each Commit

- Run `yarn prettier --write .` before committing any changes to ensure proper code formatting.

### Functional Programming

- Prefer pure functions.
- Prefer ternary operators over if statements.
- Avoid mutations and side effects when possible.
- Use `const`; avoid `let`.
- Avoid `for` loops; use `map`, `filter`, `reduce`.
- Use point-free style when appropriate: Avoid `setTimeout(() => cb())`; use `setTimeout(cb)`.

### React

- Use hooks.

### CSS

- Inline styles using PandaCSS: `className={css({ marginTop: '1em' })}`
- Only use style attribute for dynamic runtime value. PandaCSS can only handle statically analyzable values.

### Code Quality

- Write a JSDOC comment for each function definition.
- Add descriptive comments to code that is counterintuitive, non-obvious, or requires explanation.
- Avoid overly vague variable names or extraneous affixes such as "data".
- Avoid redundancy in code and naming.

### Testing

- Tests are located in `**/__tests__/*`.
- Testing guidelines are described in https://github.com/cybersemics/em/wiki/Testing.
- Use existing test helpers and follow conventions in existing tests.
- Run linter with `yarn lint`.
- Run unit tests with `yarn test`.
- Run Puppeteer tests with `yarn test:puppeteer`.
- Ensure linter, unit tests, and puppeteer tests all pass before requesting a review.
