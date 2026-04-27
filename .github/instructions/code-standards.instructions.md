### Architecture

- Before writing new code, search the codebase for related mechanisms and existing architecture.
- Prefer extending or reusing existing infrastructure over creating new solutions.

### Files, modules, and exports

- Do not create new files for constants, hooks, components, selectors, or helper functions that are only used in a single file. Instead, define them in the same file where they are used.
  - Prefer co-located functions over unnecessary abstraction. If a function is only used in one module, define it there instead of abstracting it out into a separate file.
- Only a single, default export is allowed. Named exports are not allowed.
  - Exception: action-creators are co-located with reducers in `src/actions` and exported as named exports.
  - Filenames should exactly match the default export name.

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
- Only use style attribute for dynamic runtime values. PandaCSS can only handle statically analyzable values.

### Code Quality

- Write a JSDOC comment for each function definition.
- Add descriptive comments to code that is counterintuitive, non-obvious, or requires explanation.
- Avoid overly vague variable names or extraneous affixes such as "data".
- Avoid redundancy in code and naming.
