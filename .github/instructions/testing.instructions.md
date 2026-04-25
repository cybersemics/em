### Testing

- Tests are located in `**/__tests__/*`.
- Testing guidelines are described in https://github.com/cybersemics/em/wiki/Testing.
- Use existing test helpers and follow conventions in existing tests.
- Run linter with `yarn lint`.
- Run unit tests with `yarn test`.
- Run Puppeteer tests with `yarn test:puppeteer`.
- Ensure linter, unit tests, and puppeteer tests all pass before requesting a review.
- Checking if the CI is running using if-statements in the application source code is a bad practice and should be avoided if at all possible. It adds noise to application code, pollutes the production build, and sets up potentially hard to catch bugs where the application is behaving differently in tests than in production. When mocking functionality, find a way to modify/inject the mock from the test code. For example, if you need to mock commands in the GestureMenu in the Puppeteer tests, you might use direct DOM manipulation to replace whatever commands appear with dummy commands after they are rendered in the UI. This will create a small dependency on the DOM structure (though sticking to `data-testid` and `aria-label` will mitigate this), but it's better than mocks leaking into the application code.
- Do not silently ignore unexpected states in tests by adding if-statements. Assume elements are present (or poll until they are present if there is an asynchronous action that must be awaited). Do not clutter test code with unnecessary if-stateents or try-catch statements. Allow the tests to fail hard otherwise.
- Do not use element selectors in tests. That creates unnecessary dependencies on the DOM structure. Instead, select based on `data-testid` or `aria-label` only. Add these attributes to the source code as needed.
