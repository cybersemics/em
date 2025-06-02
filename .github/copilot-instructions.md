This is a Typescript/React/Redux web app that runs as a PWA on mobile.

## Code Standards

### Required Before Each Commit

- Run `yarn prettier --write .` before committing any changes to ensure proper code formatting.

### Functional Programming

- Prefer pure functions.
- Avoid mutations and side effects when possible.
- Use map, filter, reduce.

### Coding Style

- Only a single, default export is allowed. Named exports are not allowed.
- Filename should match the default export name.

### React

- Use hooks.

### CSS

- Inline styles using PandaCSS: `className={css({ marginTop: '1em' })}`
- Only use style attribute for dynamic runtime value. PandaCSS can only handle statically analyzable values.
