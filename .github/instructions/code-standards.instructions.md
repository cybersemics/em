### Architecture

- Before writing new code, search the codebase for related mechanisms and existing architecture.
- Prefer extending or reusing existing infrastructure over creating new solutions.
- Do not access the app `store` directly. To read fresh state, dispatch a thunk and use `getState()` — this avoids importing the app `store` or adding it to a hook's dependency list:
  ```ts
  dispatch((dispatch, getState) => {
    const state = getState()
    // ...
  })
  ```

### Files, modules, and exports

- Do not create new files for constants, hooks, components, selectors, or helper functions that are only used in a single file. Instead, define them in the same file where they are used.
  - Prefer co-located functions over unnecessary abstraction. If a function is only used in one module, define it there instead of abstracting it out into a separate file.
- Avoid thin functions that give the appearance of abstraction. Before extracting a function, confirm it earns its place by answering yes to at least one of the questions below; if the answer is no to all three, inline it at the call site. A thin function enlarges the internal API while hiding the code that mattered — the significant call it wraps (e.g. a lifecycle hook such as `evaluateOnNewDocument`, or a subscription), or the condition it evaluates — making the control flow harder to follow than the code it replaced.
  - Does it reduce duplication? A helper called once does not. Neither does a single expression called twice — repeating it at both call sites is cheaper to read than a jump.
  - Does it establish an encapsulation boundary? A helper whose only consumers live in the same module does not.
  - Does it hide meaningful complexity? A one- or two-line body that just forwards its arguments does not. Neither does a body that is a single boolean expression, ternary, or lookup — inline the expression, and put any explanation in a comment above it rather than a JSDoc on a helper:
    ```ts
    // ✗ too thin: the whole function is one ternary
    /** Resolves the repeat command to the last command that was executed. */
    const resolveRepeat = (command: Command): Command | null => (command.id === 'repeat' ? lastCommand : command)

    // ✓ inline at the call site
    // the repeat command resolves to the last command that was executed
    const resolved = command.id === 'repeat' ? lastCommand : command
    ```
    Multi-line logic with branches or early returns is fine to extract.
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
- Prefer inline CSS over recipes. Only add a recipe in `src/recipes` when the styles have variants or are shared by multiple components. A single-use recipe with only base styles should be inline CSS instead.

### Code Quality

- Write a JSDOC comment for each function definition.
- Add descriptive comments to code that is counterintuitive, non-obvious, or requires explanation.
- JSDOC prose must be complete sentences (`jsdoc/require-description-complete-sentence`). Put shell commands, which are neither capitalized nor sentence-terminated, in a fenced code block, and end the lead-in line with a period rather than a colon — a colon merges the fence into the preceding paragraph and the rule then demands a period after the command. For a single command, inline code inside a sentence reads better than a fence: ``Run manually with `node scripts/estimate/src/backfill.ts`.`` Never let the rule's autofixer capitalize a command, path, or identifier.
- Avoid overly vague variable names or extraneous affixes such as "data".
- Avoid redundancy in code and naming.
