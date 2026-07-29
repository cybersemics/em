### Testing

- Tests are located in `**/__tests__/*`.
- Testing guidelines are described in `docs/testing.md`. Be sure to read this file in full before writing tests.
- Run linter with `yarn lint`.
- Run unit tests with `yarn test`.
- Run Puppeteer tests with `yarn test:puppeteer`.
- Ensure linter, unit tests, and puppeteer tests all pass before requesting a review.
- Preserve production behavior: do not add CI- or test-only application branches that change product semantics. Control external dependencies from test code through dependency injection or a named, arrange-only helper. Any unavoidable environment adaptation must be narrow, explicit, irrelevant to the assertion, and documented by the [production-parity](../../docs/testing.md#9-preserve-production-behavior) and [sanctioned-backdoor](../../docs/testing.md#sanctioned-backdoors) policies. Do not mock the subject under test or mutate the DOM inline to create alternate behavior.
- Fail hard when a required target or precondition is missing. For an asynchronous transition, use an existing named waiter or add one that waits for the specific condition. Do not use conditional logic, optional fallbacks, or `try`/`catch` to suppress an unexpected state and let the test continue or pass. See [helper contracts](../../docs/testing.md#4-compose-helpers) and [false-positive prevention](../../docs/testing.md#7-make-false-positives-difficult).
- Select elements by meaning: prefer accessible role and name, a visible label or domain value, then `aria-label`, then a purpose-built `data-testid`. Do not couple tests to styling classes, DOM ancestry, index, or render order. Add an accessible attribute or test id only when no stronger semantic locator exists. See [selector guidance](../../docs/testing.md#8-select-by-meaning-not-structure).
