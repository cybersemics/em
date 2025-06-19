This is a Typescript/React/Redux web app that runs as a PWA on mobile.

Background: https://github.com/cybersemics/em/wiki/Docs

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
- Avoid mutations and side effects when possible.
- Use map, filter, reduce.

### React

- Use hooks.

### CSS

- Inline styles using PandaCSS: `className={css({ marginTop: '1em' })}`
- Only use style attribute for dynamic runtime value. PandaCSS can only handle statically analyzable values.

### Testing

Tests are located in `**/__tests__/*`. Run unit tests with `yarn test` and Puppeteer tests with `yarn test:puppeteer`.

Testing guideslines are described in https://github.com/cybersemics/em/wiki/Testing
