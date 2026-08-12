# Testing

## How to use this guide

- If you are a **human**, read [Principles](#principles) and [Test Levels](#test-levels) once. Everything after is reference material for when you need it.
- If you are an **AI agent performing a code review**, skip to [Reviewing Tests](#reviewing-tests) and check the diff against each item. The [Principles](#principles) explain the reasoning behind each item if a finding needs justification.
- If you are an **AI agent writing a test**, start with [Principles](#principles), then use [Test Levels](#test-levels) to choose where the test belongs and imitate the golden example for that level.

## Quick Start

The project requires Node.js 22.13 or newer. Install dependencies with `yarn` before running tests.

```sh
yarn test            # unit and jsdom tests
yarn test:puppeteer  # puppeteer (Docker required; starts its own local Vite server)
```

The iOS suites require the app to already be running:

```sh
# terminal 1
yarn start

# terminal 2
yarn test:ios:browserstack  # BrowserStack credentials required
yarn test:ios:local         # local Appium and iOS Simulator required
```

See [WebdriverIO tests](#5-webdriverio-tests) for the full BrowserStack and local Appium prerequisites.

### Run a specific test

Prefer a focused test while developing:

```sh
# unit, store, or JSDOM test file
yarn test src/util/__tests__/ellipsize.ts
yarn test src/util/__tests__/ellipsize.ts -t "ellipsize"

# Puppeteer test file (the runner accepts a filename fragment)
yarn test:puppeteer caret
yarn test:puppeteer caret -t "should move the caret to the correct position"

# iOS test file
yarn test:ios:local --spec src/e2e/iOS/__tests__/caret.ts
```

To accept an intentional visual change, update only the affected Puppeteer snapshots:

```sh
yarn test:puppeteer -u render-thoughts
```

## Stack

- Vitest
- JSDOM
- React Testing Library
- Puppeteer
- Browserless
- Docker
- WebdriverIO
- GitHub Actions

## Principles

### 1. Act as the user

Every test level has a "user" — the consumer of the interface at that level. A test may only do what that level's user can do.

| Level                | The "user" is…            | …who can only                                                       |
|----------------------|---------------------------|---------------------------------------------------------------------|
| Unit                 | calling code              | call the function with arguments and read the return value          |
| Store                | the command layer         | dispatch commands/actions and read state through selectors          |
| JSDOM (RTL)          | a person (emulated DOM)   | render the app, fire events, query the visible DOM                  |
| Puppeteer / iOS      | a person                  | click, tap, type, swipe, scroll — and read what is on the screen    |

The rule holds at every level; only the identity of the user changes. At the integration level (Puppeteer/iOS) the user is a person, so the test may only click, tap, type, swipe, and read the screen. From a real code review:

> Direct access of `em.store` is not allowed in integration tests. Basically you should treat the puppeteer and iOS tests as a blackbox where the test runner can only do things that the user can do. There are a few exceptions, but that's the general policy.
>
> So instead of explicitly dispatching a `setCursor` action (which a user cannot do unless they are a developer and open up the JS console), set the cursor to null the way a normal user would: tapping the home icon in the bottom left corner, or hitting escape on the keyboard.

Note that the rule is level-dependent. Dispatching `setCursorFirstMatch` is perfectly idiomatic in a store test — dispatching actions is exactly what the store's "user" (the command layer) does. The same dispatch in a puppeteer test is a violation, because a person cannot dispatch actions.

The same applies to *reading* state, not just changing it. Asserting on Redux state couples an integration test to implementation details that can change without any change in user-facing behavior — the test then fails on harmless refactors and can keep passing while the actual user experience is broken. Assert only on what the user can observe: the rendered DOM or the exported outline.

> The use of `em.testHelpers.getState` is tightly coupling the test to various parts of the Redux state (implementation details), which we really want to avoid. It's important that integration tests behave like a normal user and do not have access to what is "under the hood."
>
> The few times we add a backdoor in existing tests are as last resorts, when there is no other way to test something. Now that we have dedicated test engineers, we need to maintain high standards and work hard to promote separation of concerns and maintainability.
>
> — [#3172 review comment](https://github.com/cybersemics/em/pull/3172#discussion_r2274819907)

### 2. Arrange with shortcuts. Act as the user. Assert on what the user sees.

Every test has three phases: **arrange** sets up the state the test needs, **act** performs the behavior the test exists to cover, and **assert** checks the result. Each phase has different rules:

- **Arrange** may use [sanctioned backdoors](#sanctioned-backdoors). Nearly every puppeteer test seeds its fixture with `paste` (a backdoor to `importToContext`) rather than typing it in keystroke by keystroke. This is deliberate: if setup went through the UI, every test would transitively depend on every feature used in its setup, and a single input bug would fail the whole suite.
- **Act** — the behavior under test — must go through a real user entry point: the actual keyboard shortcut, gesture, toolbar button, or Command Universe entry. The trigger is part of the system under test. If the shortcut breaks, the feature is broken for users even when the underlying action is fine — that is precisely the coverage an integration test adds over a store test.
- **Assert** on user-visible output: the exported outline via `exportThoughts`/`exportContext`, or DOM state queried by `aria-label`/`data-testid`. Never on Redux state.

The same division applies to JSDOM tests: dispatches and imports are allowed for arrange, but the act should normally use `@testing-library/user-event` (or `fireEvent` when the lower-level event is specifically under test). Query the result through the rendered DOM, preferring accessible roles and names over `data-testid`.

Arrange shortcuts may compress setup, but the resulting state must still be reachable through normal application behavior. Do not manufacture contradictory state or omit a precondition that is essential to the behavior—for example, invoking a cursor-only action without arranging a cursor. The exception is a test that explicitly covers recovery from corrupt or legacy data. If the application cannot create the state the test claims to reproduce, the test is not evidence that the user scenario works.

A useful invariant falls out of this: **the trigger under test appears exactly once — in the act.** When a command is needed incidentally in some other test's setup, execute it by id with the [`command`](../src/e2e/puppeteer/helpers/command.ts) helper. For example, [multiselect.ts](../src/e2e/puppeteer/__tests__/multiselect.ts) tests *copy*, so it arranges the selection with `command('selectAll')` and acts with a real `press('c', { meta: true })`. If the Select All gesture changes, exactly one test should fail — the Select All test — not every test that used selection as a stepping stone.

To decide where a command gets tested:

1. Testing the command's **logic**? Store test. `executeCommand` is the legitimate interface at that level.
2. Testing the command **as a feature**? Puppeteer/iOS test, triggered through one of its real entry points. Which entry point you choose is part of what you are covering.
3. Command needed **incidentally** in another test's arrange? `command(id)` helper — the trigger doesn't matter there, and coupling to it would create false failures.
4. Command has **no user entry point at all**? That is a product bug, not a testing problem. File it; don't test around it.

### 3. Never wait for wall-clock time. Wait for the response.

An arbitrary `sleep` used for synchronization is what you write when you don't know what condition you are waiting for. Name the condition instead: after every simulated action, ask *what would the user see change?* and wait for exactly that.

This rule is about waiting for real time to pass, not about safety limits or time-dependent behavior:

- Runner timeouts such as Vitest's `testTimeout` and WDIO's `waitforTimeout` are legitimate safety limits.
- When elapsed time is the behavior under test (debounce, throttle, delayed UI, etc.), use fake timers and advance them explicitly instead of sleeping in real time.
- Durations that are part of simulated input, such as how long a long press is held or how quickly a swipe moves, are action parameters rather than synchronization waits.

```ts
// ❌ Don't: hand-rolled polling against a state backdoor (real code — do not imitate)
const childCount = await page.evaluate(async () => {
  const em = window.em as WindowEm
  for (let i = 0; i < 20; i++) {
    if (em.getAllChildrenAsThoughts(['A']).length > 0) break
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  return em.getAllChildrenAsThoughts(['A']).length
})
```

```ts
// ✅ Do: wait for the user-visible result, then assert
await waitForEditable('hello world')

const exported = await exportThoughts()
expect(exported).toBe(`
- a
  - hello world
`)
```

If no waiter exists for your condition, the escape hatch is a **new waiter helper** (model it on [`waitForEditable`](../src/e2e/puppeteer/helpers/waitForEditable.ts) or [`waitForContextHasChildWithValue`](../src/e2e/puppeteer/helpers/waitForContextHasChildWithValue.ts)) — never a sleep. ([#3163 review comment](https://github.com/cybersemics/em/pull/3163#discussion_r2261698577))

The sanctioned `paste` and `setTheme` Puppeteer helpers still contain fixed sleeps. The iOS `showEditMenu` helper also has a documented WebKit settlement delay. These are known driver/synchronization debt, not general examples to copy. If one is changed, prefer replacing the delay with a named readiness condition when the platform exposes one.

Treat a flaky test as deterministic behavior whose controlling condition is not known yet. Reproduce it, inspect the visible output and available diagnostics, and identify that condition before adding a delay, retry, or workaround. Do not make the whole suite slower to mask one uncertain test. Most application animation durations are already reduced to zero when `navigator.webdriver` is present; tests should wait for the resulting UI state, not replay production timing. Restoring production timing to reach an otherwise-unreachable state (such as the loading phase) is a backdoor decision, not a synchronization tactic — see [Sanctioned Backdoors](#sanctioned-backdoors).

### 4. Compose helpers

Helpers are the vocabulary; tests are sentences. A puppeteer test should read as a sequence like `paste → clickThought → press → waitForEditable → exportThoughts → expect`. There are helpers for nearly everything (see [Test Helpers](#test-helpers)); use them before writing raw Puppeteer calls or Redux plumbing.

Writing a **new helper** is allowed but is a design event, not a workaround: name it after the user's intent (`clickThought`, not `clickDivTreeNode`), put it in the helpers directory, and expect it to be reviewed as shared vocabulary. Inline `page.evaluate` in a test file is acceptable only for reading user-visible DOM (e.g. counting elements by `aria-label`); anything touching `window.em` belongs in a sanctioned helper or nowhere.

A helper should have a narrow, explicit contract:

- Do one user action or query one condition. A helper may compose the low-level driver calls that make up a single action (`longPressThought` holds and releases a touch), but it must not bundle several distinct user steps into one call — those stay inline in the test ([Principle 5](#5-keep-tests-concrete-and-boring)).
- Keep expectations in the test so the behavior being proved is visible. A helper may wait for the action it performs to settle, but it must not hide unrelated assertions or synchronization.
- Accept semantic inputs and named options rather than exposing browser plumbing or positional booleans.
- If a required target or precondition is missing, throw a descriptive error. Do not silently return, use an optional-chain fallback, or allow the test to pass without performing its act.

### 5. Keep tests concrete and boring

A test is orchestration code. Anyone — human or agent — should be able to read it top to bottom and know exactly what user session it reproduces and what outcome it expects. No cleverness, no abstraction for its own sake, no conditional logic.

In tests, a little duplication is usually clearer than an abstraction:

- Inline short, meaningful fixtures and expected values. Do not derive the expected value with the same logic used by the implementation.
- Inline the user's steps. When several tests open the same way — `importText` → `setCursor` → `toggleNote` — repeat it. Those are the concrete steps the user takes, so the repetition is inherent in the test case, not an implementation detail to hide away. ([#4657 review comment](https://github.com/cybersemics/em/pull/4657#discussion_r3670180268))
- Reuse canonical domain constants and genuinely complex setup, but do not introduce a helper merely to avoid repeating a few literals.
- Cover one independently diagnosable behavior or condition per test. A tightly coupled positive/negative pair may share an expensive E2E session when the test name and assertions still make failures unambiguous.
- Avoid a combinatorial cross-product of orthogonal presentation variants. Each higher-level variant should protect a distinct risk.

That applies with full force to a local wrapper around a sequence of steps, however tidy it looks: a `setupNote(text)` that hides `importText` + `setCursor` + `toggleNote` saves a few lines but forces every reader to jump elsewhere to learn which user session the test reproduces, and it quietly changes every other test the moment one of them needs a variation. The shared vocabulary in the [helper directories](#test-helpers) is not an exception to this — each of those helpers performs one user action named after the user's intent. They are the words; the test writes the sentence.

That includes the test name: it states the expected behavior, not the function under test.

- NO: ~~`indent works`~~
- YES: `indent an empty thought when space is pressed at the start`

### 6. Do not hide tests

- Never commit `.only`.
- A new `.skip` must explain why it cannot run and link to the issue or follow-up that will enable it. A skipped test documents intended behavior; it does not count as coverage.
- The staged [TDD regression workflow](#tdd-regression-validation) is the one transient exception: its newly added `it.skip` plus bare issue URL is a recognized red-test marker. The focused runner and TDD workflow explicitly unskip it, and the fix must remove `.skip` before merge.
- Retries are reserved for documented external nondeterminism. They are not a substitute for waiting on the correct condition or fixing a deterministic failure.

### 7. Make false positives difficult

An assertion must distinguish the intended behavior from plausible wrong behavior. Assert the exact result, not a convenient proxy:

- Prefer direct, typed matchers such as `expect(actual).toBe(expected)` over truthiness checks.
- Assert the complete relevant output when a partial count, substring, or absence from one context could still pass after the wrong mutation.
- When the bug could produce a specific wrong destination or duplicate, assert both the desired effect and the absence of that wrong result.
- Do not trim, normalize, sort, or otherwise transform actual output merely to make the assertion pass unless that transformation is itself part of the public contract.

Preconditions matter too. If the act did not occur because its target was missing, the test must fail at that point rather than drift into an assertion that can pass coincidentally.

Negative assertions have a timing requirement. "The menu does not appear" must be evaluated at the moment the wrong behavior would manifest — while the gesture is held, before the popup would have been dismissed — or be superseded by a positive assertion that could not hold if the wrong behavior had occurred. A negative check made after the window has closed is vacuous. The same discipline applies wherever the product commits behavior at a lifecycle boundary (release, blur, submit, timer flush): the final assertion must run after that commit point, and cleanup must not perform the completing step after the last assertion.

This principle also governs the machinery that judges tests. A CI step that validates a test run is itself an assertion, and must distinguish the intended signal (the test executed and failed on its assertion) from plausible wrong signals (the test never ran: a compile error, missing credentials, an environment failure). An exit code alone cannot make that distinction.

### 8. Select by meaning, not structure

Choose the most semantic locator available:

1. Accessible role and name, visible label, or domain value (for example, `clickThought('hello')`).
2. A stable `aria-label`.
3. A purpose-built `data-testid` when no user-facing semantic target exists.
4. A named query helper when the semantic lookup is necessarily more involved.

Do not select by styling or animation classes, generic ids, DOM ancestry, `parentElement` chains, array index, render order, or an unrelated neighboring control. Those selectors describe the current implementation rather than the thing the user is interacting with. If several elements intentionally match, query the semantic collection and assert its cardinality explicitly.

### 9. Preserve production behavior

Tests should exercise the same product semantics that users run. Do not add CI- or test-only branches to application code merely to make a test pass. Such branches ship test knowledge in the production build and can make the suite exercise behavior that users never receive.

When a dependency must be controlled:

1. Mock only an external boundary, and install the substitute from test code when possible.
2. Prefer an existing dependency-injection seam or a named, arrange-only helper. Never replace the function, component, command, or effect the test claims to cover.
3. If the browser or device driver cannot create a required condition, use a narrowly scoped helper from the [sanctioned backdoor](#sanctioned-backdoors) policy. Do not compensate with ad hoc application branches or inline DOM mutation.

Environment-specific application code can be legitimate when it changes only test mechanics, such as reducing irrelevant animation durations, preventing browser interference, or exposing diagnostics. It must be explicit, narrowly scoped, production-default-safe, and unable to change the semantic outcome under assertion. If timing, animation, or the adapted behavior is the subject of the test, exercise the real production behavior instead.

## Test Levels

The project has multiple levels of automated testing, from single function unit tests up to realistic end-to-end (E2E) tests that run tests against an actual device or browser.

**Use the lowest level that is sufficient for your test case.** If your test case does not require a DOM, use a unit test. If it requires a DOM but is not browser or device-specific, use a React Testing Library (RTL) test. Higher-level tests may provide a more realistic testing environment, but they are slower and, in the case of WebdriverIO on BrowserStack, cost per minute of usage.

**Cover each behavior at exactly one level.** Once a unit, store, or JSDOM test proves a behavior, do not add a Puppeteer or iOS test that proves the same thing again. A higher-level test is justified only by a distinct risk that the lower-level test cannot cover, such as real browser or device behavior, input mapping, or a visual regression. Redundant integration tests add no coverage and lengthen every future test run.

Mock an external boundary only when that boundary is not the subject of the test. Do not mock the function or effect being proved, reimplement a rendered component inside its test, or assert only that a mock behaved as configured. When JSDOM cannot exercise the relevant browser behavior—layout, scrolling, selection, native input, and similar APIs—move the test to Puppeteer instead of replacing the behavior with a mock.

### 1. Unit Tests

⚡️⚡️⚡️ 1–20ms each

Basic unit tests are great for testing pure functions directly. The "user" is calling code: arguments in, return value out.

Related tests: [actions](../src/actions/__tests__), [selectors](../src/selectors/__tests__), [util](../src/util/__tests__)

Golden example: [`ellipsize.ts`](../src/util/__tests__/ellipsize.ts)

### 2. Store Tests

⚡️⚡️⚡️ 1–20ms each

Command tests require dispatching Redux actions but do not need a DOM. Import the shared app store, reset it with `beforeEach(initStore)`, and invoke the production `executeCommand` or `executeCommandWithMulticursor` API. Read the result through selectors rather than inspecting arbitrary state fields. This allows commands to be tested independently of the user device.

The idiom: seed with a plaintext outline (`importText`), execute the command, assert on the exported outline. From [`indent.ts`](../src/commands/__tests__/indent.ts):

```ts
beforeEach(initStore)

it('indent on empty thought', () => {
  store.dispatch(
    importText({
      text: `
        - a
      `,
    }),
  )
  store.dispatch([setCursor(['a']), newThought({ value: '' })])

  executeCommandWithMulticursor(indentCommand, { store, type: 'keyboard' })

  const exported = exportContext(store.getState(), [HOME_TOKEN], 'text/plain')

  expect(exported).toEqual(`- ${HOME_TOKEN}
  - a
    - `)
})
```

Related tests: [commands](../src/commands/__tests__)

### 3. JSDOM Tests

⚡️⚡️ 1–1000ms each

Anything that tests a rendered component requires a DOM. If there are no browser or device quirks, you can get away with testing against an emulated DOM (`jsdom`) which is cheaper and faster than a real browser.

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (RTL)

Mount the app with `createTestApp`, seed state via dispatch (allowed at this level for arrange), and assert on the DOM by `aria-label`/`data-testid`.

Related tests: [components](../src/components/__tests__)

Golden example: [`Bullet.ts`](../src/components/__tests__/Bullet.ts)

### 4. Puppeteer Tests

⚡️ 1–2s each

```sh
yarn test:puppeteer
```

Puppeteer is a Node.js library that provides a high-level API for controlling a Chromium-based browser (Chrome or Chromium) via the DevTools Protocol. It is maintained by the Chrome DevTools team and is primarily used for browser automation. We run ours in a Docker container to ensure consistent results on different dev machines and the CI.

Puppeteer allows you to launch a real browser instance (headless or visible), navigate to pages, interact with the DOM, execute JavaScript in the page context, capture screenshots or PDFs, and observe network or performance behavior programmatically.

The "user" at this level is a person. Tests are blackbox: compose the user-action helpers, and touch app internals only through the [sanctioned backdoors](#sanctioned-backdoors). The following is the preferred shape for an undo test (adapted from [`undo.ts`](../src/e2e/puppeteer/__tests__/undo.ts)):

```ts
it('restore the previous thought text on undo', async () => {
  await paste(`
    - hello
  `)

  // Create undo history through the UI. A fixture backdoor cannot create a real edit history.
  await clickThought('hello')
  await press('ArrowRight', { ctrl: true })
  await keyboard.type(' world')
  await waitForEditable('hello world')

  // Act.
  await press('z', { meta: true })
  await waitForEditable('hello')

  const thoughtValue = await getEditingText()
  expect(thoughtValue).toBe('hello')
})
```

Related tests: [/src/e2e/puppeteer](../src/e2e/puppeteer)

The Puppeteer tests are run via Vitest using the `puppeteer-e2e` project defined in [vitest.config.ts](../vitest.config.ts), which uses a custom [puppeteer-environment.ts](../src/e2e/puppeteer-environment.ts). Locally, the runner script at [src/e2e/puppeteer/test-puppeteer.sh](../src/e2e/puppeteer/test-puppeteer.sh) starts the Browserless container and a dedicated Vite dev server on port 2552. In CI, the workflow supplies the Browserless service and built app server instead.

#### Tips

High level helper functions are available for executing common user interactions: [/src/e2e/puppeteer/helpers](../src/e2e/puppeteer/helpers)

Mobile devices can be emulated in puppeteer. This is good for testing non-platform specific mobile functionality, such as gestures. If you can test it with the Chrome Device Toolbar, you can emulate it in puppeteer. Select the device at suite scope so that shared setup applies it before navigation; changing mobile or touch emulation after navigation may reload the page and restart app initialization.

```ts
deviceEmulation.useForSuite(KnownDevices['iPhone 15 Pro'])

it('creates a thought with a gesture', async () => {
  await gesture(newThoughtCommand)
  await keyboard.type('a')
})
```

While we prefer to avoid backdoor access to state in integration tests, it is recommended that you use the [exportThoughts](../src/e2e/puppeteer/helpers/exportThoughts.ts) helper for asserting the overall thought structure. Parsing the DOM, activating the Export modal, or taking a snapshot are either too slow or too tightly coupled to other functionality. `exportThoughts` is fast, direct, and makes for readable tests.

```ts
  const exported2 = await exportThoughts()
  expect(exported2).toBe(`
- a
- b
- c
`)
```

#### Visual snapshot tests

Snapshot tests are a specific type of puppeteer test used to prevent visual regressions. They automate taking a screenshot on your PR branch and then comparing it to a reference screenshot in `main`. If the screenshot differs by a certain number of pixels, then it is considered a regression and the test will fail. In the case of a failed snapshot test, a visual diff will be generated that allows you to see why it failed.

Do not use snapshot tests for testing behavior (such as the result of a user action). Instead, select DOM elements by aria label or data-testid. Use snapshot tests for covering visual regressions such as positioning, layout, svg rendering, and general appearance of components.

In the following example, the superscript position broke so the snapshot test failed. The expected snapshot is on the left; the current snapshot is on the right.

![font-size-22-superscript-1-diff](https://github.com/user-attachments/assets/9325a0fa-f616-4582-b348-716e6d7e63f7)

When running locally, the diff path is printed in the shell. On a pull request, the Puppeteer Diff Comment workflow posts the expected/current images inline and includes a targeted update command. The raw diffs are also downloadable from the `__diff_output__` workflow artifact:

<img width="587" alt="Screenshot 2024-11-08 at 11 30 25 AM" src="https://github.com/user-attachments/assets/8737a224-59b5-4736-99db-d9d9dacef0e3">

If you are absolutely sure that the change is desired, and your PR was supposed to change the visual appearance of **em**, update only the affected snapshot file:

```sh
yarn test:puppeteer -u render-thoughts
```

### 5. WebdriverIO tests

⚡️ 1–2s each (but large overhead to start session)

Start the app before either iOS suite:

```sh
# terminal 1
yarn start

# terminal 2: choose one
yarn test:ios:browserstack
yarn test:ios:local
```

For BrowserStack, put the credentials in `.env.test.local`:

```dotenv
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
```

The BrowserStack configuration starts and stops a temporary Cloudflare tunnel automatically so the real device can reach the local HTTPS app.

Local Appium requires macOS with Xcode and an iOS Simulator, Appium, and the XCUITest driver:

```sh
npm install -g appium
appium driver install xcuitest
appium
```

Run Appium in addition to `yarn start`, then run `yarn test:ios:local`. The local configuration installs Vite's generated development certificate in the booted simulator, so run `yarn start` at least once before starting the suite.

WebdriverIO tests provide automated test coverage of actual iOS devices (among others) in the cloud with BrowserStack. This allows us to cover some of the trickiest platform-specific behaviors, such as browser selection and autoscroll. The same blackbox rules apply as for puppeteer tests.

`wdio` executes test suites with native `WebDriver` support via `@wdio/mocha-framework` and `@wdio/browserstack-service`, which is responsible for session and credential management. `wdio` also provides lifecycle hooks that are helpful for initiating a session efficiently.

The configuration files live in [src/e2e/iOS/config](../src/e2e/iOS/config). [wdio.base.conf.ts](../src/e2e/iOS/config/wdio.base.conf.ts) contains common iOS Safari settings and lifecycle hooks. [wdio.browserstack.conf.ts](../src/e2e/iOS/config/wdio.browserstack.conf.ts) loads credentials, starts the Cloudflare tunnel, and configures `@wdio/browserstack-service`. [wdio.local.conf.ts](../src/e2e/iOS/config/wdio.local.conf.ts) configures local Appium and the iOS Simulator.

#### Origin health check

An iOS run is only as good as the origin it loads, and a wrong origin is indistinguishable from a working one to a naive check: a Cloudflare edge error page (502, 1033, "can't reach origin") and the Vite token gate's `403` are both well-formed HTML documents with a `<body>`. Two hooks in [`wdio.base.conf.ts`](../src/e2e/iOS/config/wdio.base.conf.ts) assert the page is actually em:

- **`onPrepare`** requests the URL the device will load (`CLOUDFLARED_URL`, else `https://localhost:3000`) from the runner and requires `200` plus em's own `data-app="em"` marker on the root container in [`index.html`](../index.html) (a generic `id="root"` is not distinctive enough to rule out an error page). This runs in the launcher, before any session exists, so a wrong origin costs one request rather than the whole retry budget — a worker cannot change `specFileRetries`, so an origin discovered bad later fails every spec five times over. It throws rather than exiting so each config's own handler can clean up first (notably killing the cloudflared connector, which would otherwise be orphaned and hold a pool hostname against other runs). It is skipped in CI when `CLOUDFLARED_URL` is unset, because the app is then served over plain HTTP and the `https` localhost URL is not the origin under test.
- **`before`** waits on the device for `[data-app="em"]` to have children — that is, for em's own JavaScript to have run — rather than for a `<body>` to exist. It backstops the case where the device reaches something the runner does not.

Either failure names what was found instead: the HTTP status, `<title>`, and a snippet of the page, plus the device's `location.href` and visible text.

wdio documentation:

- https://webdriver.io/docs/cli
- https://webdriver.io/docs/configurationfile
- https://webdriver.io/docs/browserstack-service

#### Cloudflare tunnel for the dev server

BrowserStack's iOS Safari devices load the app over a public HTTPS URL rather than BrowserStack Local, because Safari blocks `localStorage` on self-signed certs. [`wdio.browserstack.conf.ts`](../src/e2e/iOS/config/wdio.browserstack.conf.ts) exposes the local dev server (`https://localhost:3000`) through a pool of **named Cloudflare Tunnels** on our own domain, `emthought.cc`, using [`cloudflared`](https://github.com/cloudflare/cloudflared) (the npm binary — no Docker). This is used by every path that runs iOS Safari tests: [`ios.yml`](../.github/workflows/ios.yml), the iOS job in [`tdd.yml`](../.github/workflows/tdd.yml), and local/agent `yarn test:ios` runs.

We use a fixed-domain pool rather than the ephemeral `*.trycloudflare.com` quick tunnel `cloudflared` offers out of the box, because that quick-tunnel hostname is random and third-party — allowlisting it in the Copilot agent firewall means allowlisting *anyone's* `trycloudflare.com` tunnel, not just ours. A pool of tunnels on a domain we own lets us allowlist exactly what we need, while still tolerating a dead or already-claimed tunnel (see below).

> The dev server is served over plain **HTTP** in CI (the `Serve` step sets `HTTP=1`; Cloudflare terminates TLS at its edge, so the connector-to-origin hop needs none of its own). Vite enforces `server.allowedHosts`/`preview.allowedHosts` for HTTP servers, so the pool's public hostnames **must** be listed there — `.emthought.cc` appears in both in [`vite.config.ts`](../vite.config.ts). `preview.allowedHosts` does not inherit from `server.allowedHosts`, and `yarn servebuild` (vite preview) is what CI actually runs, so both entries are load-bearing.

##### How a run claims a tunnel

[`cloudflareTunnelPool.ts`](../src/e2e/iOS/config/cloudflareTunnelPool.ts) exports `findFirstAvailableTunnel(pool, appGateToken)`, called from `wdio.browserstack.conf.ts`'s `onPrepare`. `pool` comes from the `CLOUDFLARE_TUNNEL_POOL` env var (a JSON array of `{ name, hostname, token }`); `appGateToken` is the per-run `TUNNEL_TOKEN` (the Vite app-gate secret — see `tunnelTokenGate` in [`vite.config.ts`](../vite.config.ts)).

A named tunnel accepts multiple simultaneous connectors (that's Cloudflare's HA design) and the edge load-balances **per request** across all of them. So once a run has attached its own connector it can no longer tell whether a hostname is exclusively its own: a `200` might be its own server and a `403` someone else's, at random. A single successful probe proves nothing — confirmed empirically, where two concurrent runs both got a clean `200` on the same tunnel and then had cross-talk for the rest of their sessions.

The fix is to ask **before** attaching. For each candidate, in turn, the run requests `https://<hostname>/__tunnel-status` with no connector of its own in the mix, so anything that answers is unambiguously another run:

- **`530`** (Cloudflare error 1033, no connector registered) — nobody home, the candidate is free.
- **`200`** — an em instance is already answering; the payload carries its `GITHUB_RUN_ID`, so the log names the occupying run (and a run can recognise its own leftover connector rather than mistaking it for a competitor).
- **`403`** — an em instance is answering but predates the status route; still occupied.

Only then does the run attach its connector, and it requires a burst of consecutive successful token probes (each over a fresh connection, since a pooled one would re-test the same backend every time) before trusting the claim. The pre-check is not a lock — two runs can see the same tunnel free in the same instant — so the burst remains as the backstop for that race.

If every tunnel is occupied the run waits, rescanning the pool every 10s for up to 45 minutes, rather than failing immediately. The starting index is derived from `GITHUB_RUN_ID` (or the PID locally) so concurrent runs spread across the pool instead of all racing for the first entry.

This means `ios.yml`, `tdd.yml`, and local/agent runs can safely run concurrently against the same pool without a shared cross-workflow lock — each just claims whichever tunnel is free. (The job-level `browserstack` concurrency group in `ios.yml` still exists, but purely because of BrowserStack's own shared parallel-session cap, not the tunnel — see [Layered BrowserStack concurrency](#layered-browserstack-concurrency).)

##### One-time setup: provisioning the pool

> The provisioning script is deliberately **not committed** — it is an operator tool for whoever administers the pool, not part of the app, and it is gitignored. Ask the pool administrator for a copy if you need to create or top up tunnels; nothing in normal development or CI requires it.

Requires an **Account**-scoped Cloudflare permission grant including `Cloudflare One Connector: cloudflared Write` (Tunnel management is an account resource, not zone-scoped — a zone-scoped grant like the one used for `emthought.cc`'s bot/firewall settings does not cover it).

1. `cloudflared tunnel login`, authorizing the `emthought.cc` zone.
2. Run `provision-cloudflare-tunnel-pool.sh [POOL_SIZE] [NAME_PREFIX] [DOMAIN]`. It creates each tunnel, routes its DNS CNAME, and fetches its connector token via the CLI — no dashboard steps, no timing-sensitive "catch the connector while it's live" dance.
3. The script writes `cloudflare-tunnel-pool.json` (gitignored — it contains live tokens). Set its contents as the GitHub Actions secret `CLOUDFLARE_TUNNEL_POOL`: `gh secret set CLOUDFLARE_TUNNEL_POOL < cloudflare-tunnel-pool.json`.
4. Re-run the script (same or a larger `POOL_SIZE`) any time to top up the pool — it reuses tunnels that already exist rather than recreating them.

##### If you're a developer who needs tunnel access

If you're a developer or agent making changes to BrowserStack CI, you'll need access to a **separate tunnel pool used for the development environment**. Ask the project maintainer, who will be able to give you access to the values needed for the `CLOUDFLARE_TUNNEL_POOL` secret.

Related tests: [/src/e2e/iOS](../src/e2e/iOS)

### Vitest configuration

[`vitest.config.ts`](../vitest.config.ts) defines two projects, both extending [`vite.config.ts`](../vite.config.ts):

- **`unit`** — `jsdom` environment, picks up everything under `**/__tests__/**/*.ts` excluding `e2e/` and `.claude/`. The include glob is unanchored, and `.claude/worktrees/` holds agent worktrees — full checkouts of this repo — so without that second exclusion a test run collects every test several times over, and fails outright on any worktree where PandaCSS has not been run, since `styled-system/` is generated and gitignored. Git hides those worktrees via `.git/info/exclude`, which Vitest does not consult. Setup files: [`vitest-localstorage-mock`](https://www.npmjs.com/package/vitest-localstorage-mock) (loaded first to ensure `localStorage` is defined in CI), then [`src/setupTests.js`](../src/setupTests.js). Used by `yarn test`.
- **`puppeteer-e2e`** — custom environment [`puppeteer-environment.ts`](../src/e2e/puppeteer-environment.ts), setup file [`puppeteer/setup.ts`](../src/e2e/puppeteer/setup.ts), only includes `src/e2e/puppeteer/__tests__/*.ts`. The `vite-plugin-terminal` plugin pipes `console.log` from the page back to the terminal so Puppeteer test failures are debuggable. Used by `yarn test:puppeteer`; locally, [`test-puppeteer.sh`](../src/e2e/puppeteer/test-puppeteer.sh) also starts Browserless and a dedicated Vite dev server on port 2552.

iOS tests are not part of the Vitest config — they run under WDIO, see [WebdriverIO tests](#5-webdriverio-tests).

### Isolation and cleanup

Every test starts from a known state, and setup must be paired with the matching cleanup:

```ts
// store test
beforeEach(initStore)

// rendered JSDOM test
beforeEach(createTestApp)
afterEach(cleanupTestApp)
```

`initStore` clears the shared store and enables fake timers. `createTestApp` additionally mounts the React tree, initializes persistence and event handlers, and enables the test drag-and-drop backend. `cleanupTestApp` clears storage, the TreeCRDT thoughtspace, the store, and event handlers, and flushes pending timers. Do not share fixture state between tests or rely on test execution order.

## Sanctioned Backdoors

Integration tests are blackbox, but named helpers may take shortcuts during arrange, assert, and synchronization. The categories below are the exception policy. Exceptions are enumerated, not invented: a test file must never touch `window.em`, `em.store`, `em.testHelpers`, or mutate the DOM directly. If a new backdoor is genuinely needed, put it in a helper named after the test author's intent, document its phase and constraint here, and have it reviewed as shared test vocabulary. A pull request that adds or changes a helper touching `window`, `navigator`, timers, or animation timing must update this table in the same PR.

| Category | Phase | Sanctioned helpers | Constraint |
|---|---|---|---|
| Fixture and lifecycle | Arrange | Puppeteer [`paste`](../src/e2e/puppeteer/helpers/paste.ts) and [`resetApp`](../src/e2e/puppeteer/helpers/resetApp.ts); iOS [`paste`](../src/e2e/iOS/helpers/paste.ts) and [`resetApp`](../src/e2e/iOS/helpers/resetApp.ts) | Seed or clear state without testing the Import UI or tutorial. Never use to perform the behavior under test. |
| Incidental app setup | Arrange | [`command`](../src/e2e/puppeteer/helpers/command.ts), [`openModal`](../src/e2e/puppeteer/helpers/openModal.ts), [`setTheme`](../src/e2e/puppeteer/helpers/setTheme.ts) | Use only when the command, modal entry point, or Settings navigation is not under test. |
| Browser/driver limitation | Arrange | Puppeteer [`setSelection`](../src/e2e/puppeteer/helpers/setSelection.ts) and [`closeKeyboard`](../src/e2e/puppeteer/helpers/closeKeyboard.ts); iOS [`setSelection`](../src/e2e/iOS/helpers/setSelection.ts) | Simulate browser state the driver cannot reliably produce. The subsequent behavior under test must still use a real user entry point. |
| Visual snapshot stabilization | Arrange | [`hide`](../src/e2e/puppeteer/helpers/hide.ts), [`hideVisibility`](../src/e2e/puppeteer/helpers/hideVisibility.ts), [`hideHUD`](../src/e2e/puppeteer/helpers/hideHUD.ts), [`showMousePointer`](../src/e2e/puppeteer/helpers/showMousePointer.ts), [`screenshot`](../src/e2e/puppeteer/helpers/screenshot.ts) | DOM/style mutation is allowed only to remove irrelevant nondeterminism or expose input position in a visual test. Do not hide the subject of the snapshot. |
| Test environment controls | Arrange | [`simulateDragAndDrop`](../src/e2e/puppeteer/helpers/simulateDragAndDrop.ts), [`scrollTo`](../src/e2e/puppeteer/helpers/scrollTo.ts), the thoughtspace storage selection in [`puppeteer/setup.ts`](../src/e2e/puppeteer/setup.ts), and reviewed helpers that set [`testFlags`](../src/e2e/testFlags.ts) | Use only for a condition that cannot be created reliably through normal input, explain why, and restore mutable flags in the corresponding `afterEach` or `afterAll` hook. The control must not change the semantic outcome under test. |
| Structural assertion | Assert | [`exportThoughts`](../src/e2e/puppeteer/helpers/exportThoughts.ts) | Export the thought tree as plaintext. Do not make additional assertions on Redux state. |
| Non-visual synchronization | Wait | [`waitForContextHasChildWithValue`](../src/e2e/puppeteer/helpers/waitForContextHasChildWithValue.ts), [`waitForThoughtExistInDb`](../src/e2e/puppeteer/helpers/waitForThoughtExistInDb.ts), [`waitForState`](../src/e2e/puppeteer/helpers/waitForState.ts) | Use only when persistence or another prerequisite has no immediate visual signal. This is synchronization, not the test's assertion; assert the final user-visible result separately. |
| Timing/environment spoofing | Arrange | [`reloadWithProductionTiming`](../src/e2e/puppeteer/helpers/reloadWithProductionTiming.ts) (spoofs `navigator.webdriver` to restore production animation timing) | Use only for a state that cannot exist under test timing (such as the loading phase). Justify in the helper's doc comment and state how the spoof is undone (per-test page isolation counts, but say so). Subsequent waits must still name conditions rather than replay production durations. |

DOM reads are different from backdoors: inline `page.evaluate`/`browser.execute` may read user-visible DOM when no helper exists, though a repeated read should become a named helper. It may not dispatch actions, mutate app state, set test flags, or write to the DOM.

Backdoors are never the act. The behavior under test always goes through a real user entry point (Principle 2).

A few older tests access `window.em`, set test flags inline, mutate the DOM, or hand-roll waits. Known examples include [`spaceToIndent.ts`](../src/e2e/puppeteer/__tests__/spaceToIndent.ts), the specialized initialization test in [`startup.ts`](../src/e2e/puppeteer/__tests__/startup.ts), replication-delay setup in [`scroll.ts`](../src/e2e/puppeteer/__tests__/scroll.ts), and drag-hover timing in [`drag-and-drop.ts`](../src/e2e/puppeteer/__tests__/drag-and-drop.ts). They predate this policy; do not imitate them. When one is materially changed, move the exception behind a named helper and add it to the category table.

## Reviewing Tests

The review checklist is the Principles in checkable form. Every item is a yes/no question about the diff.

The scope of a review is everything the tests depend on to mean something: the test files, the helpers and setup files they compose, and the CI workflows that run or validate them. Principle 7 applies to that machinery too — a validation step is itself an assertion, and "the run exited nonzero" does not distinguish *the test failed* from *the test never ran*.

1. **Level and cost** — Is the test at the lowest sufficient level? Does each higher-level case protect a distinct risk instead of multiplying orthogonal variants? (Pure logic → unit/store; rendering → JSDOM; browser/device behavior or input mapping → Puppeteer/iOS.)
2. **Reachable arrange** — Could normal application behavior create the arranged state? Are essential preconditions present and non-contradictory?
3. **Act** — Is the behavior under test triggered through a real user entry point (Puppeteer/iOS), `userEvent`/`fireEvent` (JSDOM), or the public interface (unit/store)?
4. **Backdoors** — Are internals touched only via the [sanctioned helpers](#sanctioned-backdoors), and only in arrange/assert/wait — never in the act?
5. **Waiting and flakes** — No wall-clock sleeps or hand-rolled polling loops? Does each wait name a condition? Are non-visual state/DB waiters only prerequisites to a visible assertion? Was the controlling condition investigated before adding a retry or workaround?
6. **Helper contracts** — Is the test composed from narrow, intent-named helpers? Are expectations visible in the test, unrelated waits absent from action helpers, and missing required targets reported as errors?
7. **Selectors** — Do DOM locators identify meaning (role/name, label, semantic value, or test id) rather than style, ancestry, index, or render order?
8. **Assertions** — Do assertions read exact user-visible output rather than Redux state, truthiness, or a proxy that plausible wrong behavior could satisfy? Is every negative assertion evaluated while the wrong behavior could still manifest, or superseded by a positive assertion that excludes it?
9. **Commit point** — Does the final assertion run *after* the moment the product commits the behavior under test (release, blur, submit, timer flush)? Cleanup must not perform the completing step after the last assertion — if release triggers execution, release inside the test body and assert the outcome afterwards.
10. **Scope and coupling** — Does the test cover one independently diagnosable behavior? Is its trigger used exactly once, with incidental commands going through `command(id)`?
11. **Snapshots** — Are image snapshots used only for visual regressions, never for behavior?
12. **Production parity and mocks** — Does the test exercise the same semantic behavior as production? Is any environment-specific adaptation explicit, narrow, and irrelevant to the assertion? Are only external boundaries mocked, leaving the production subject under test intact?
13. **Naming** — Does the test name state the expected behavior specifically? ("`b` should be expanded", not "should work correctly".)
14. **Readability** — Does the test read top-to-bottom as an obvious, concrete user session without unnecessary abstraction or conditional logic? Are the user's steps inlined rather than bundled into a local setup wrapper? Any exception must explain why it is necessary.
15. **Fixture and isolation** — Does the test rely on—rather than repeat—the canonical setup/cleanup for its level, and avoid depending on another test's state or execution order?
16. **Visibility** — No committed `.only`? Is every new `.skip` either the recognized transient TDD marker or linked to an issue/follow-up with its reason stated? Does the final fixed change remove the transient skip? Are retries justified by documented external nondeterminism?
17. **Regression proof** — If this test accompanies a bug fix, does it fail on the intended assertion with the reproduced buggy value on the relevant pre-fix commit, then pass with the same assertion on the pull request? State *what specifically* fails pre-fix and why — "the TDD workflow will check" is not an answer, because the workflow proves an exit code, not a mechanism. If a test guards behavior that already works on the control commit, say so explicitly and note which test carries the red side. See [Regression Tests](#regression-tests) and [TDD regression validation](#tdd-regression-validation).

The checklist enumerates the common cases, not the principles' reach. Finish with one pass per [Principle](#principles), asking: what does this diff contain that this rule governs but no item above named? The findings that matter most are often one level up from the test bodies — in a helper's contract, or in the CI that judges the run.

## Test Helpers

There are three helper directories. Use them before reaching for raw Redux dispatches, browser APIs, or DOM queries.

### `src/test-helpers/` — for unit, store, and JSDOM tests

The helpers in [`../src/test-helpers/`](../src/test-helpers) cover store setup and operations that are otherwise verbose to write by hand:

- [`createTestApp`](../src/test-helpers/createTestApp.tsx) — mounts `<App />` into the JSDOM environment via `@testing-library/react`, runs `initialize({ storage: 'memory' })`, swaps in `react-dnd-test-backend`, opts into fake timers, and closes the welcome modal. Use this when a test touches the rendered app. Pair every call with `cleanupTestApp` (it clears `localStorage`, the TreeCRDT thoughtspace, the store, and event handlers).
- [`initStore`](../src/test-helpers/initStore.ts) — initializes the store without mounting the React tree, for store-level tests that don't need a DOM.
- [`importToContext`](../src/test-helpers/importToContext.ts) — seeds the store with a tree from a multi-line plaintext outline (the same format the `Import` modal accepts). Most fixture setup goes through this.
- [`dispatch`](../src/test-helpers/dispatch.ts) — a thin wrapper that lets a test dispatch synchronously without re-typing `store.dispatch(...)` plumbing.
- **Operate-by-value helpers.** Where a test would otherwise need to look up a `ThoughtId` to dispatch an action, prefer the value-keyed variants:
  - [`newThoughtAtFirstMatch`](../src/test-helpers/newThoughtAtFirstMatch.ts), [`editThoughtByContext`](../src/test-helpers/editThoughtByContext.ts), [`moveThoughtAtFirstMatch`](../src/test-helpers/moveThoughtAtFirstMatch.ts), [`deleteThoughtAtFirstMatch`](../src/test-helpers/deleteThoughtAtFirstMatch.ts), [`addMulticursorAtFirstMatch`](../src/test-helpers/addMulticursorAtFirstMatch.ts).
- **Read-by-value helpers.** [`getAllChildrenByContext`](../src/test-helpers/getAllChildrenByContext.ts), [`getChildrenRankedByContext`](../src/test-helpers/getChildrenRankedByContext.ts), [`getAllChildrenAsThoughtsByContext`](../src/test-helpers/getAllChildrenAsThoughtsByContext.ts), [`attributeByContext`](../src/test-helpers/attributeByContext.ts), [`contextToThought`](../src/test-helpers/contextToThought.ts).
- [`expectPathToEqual`](../src/test-helpers/expectPathToEqual.ts) — Jest matcher that compares paths by their thought *values* rather than ids, so test failures are readable.
- [`checkDataIntegrity`](../src/test-helpers/checkDataIntegrity.ts) — assertions that catch parent/child mismatches, missing Lexemes, and orphaned thoughts. Useful as a final assertion in mutation-heavy tests.
- [`dataProviderTest`](../src/test-helpers/dataProviderTest.ts) — shared assertions for storage providers that implement the data provider interface.

### `src/e2e/puppeteer/helpers/` — for Puppeteer tests

Puppeteer input is coordinated through the helpers in [`../src/e2e/puppeteer/helpers/`](../src/e2e/puppeteer/helpers):

| User action | Helper | Implementation |
|---|---|---|
| Click or tap a selector | [`click`](../src/e2e/puppeteer/helpers/click.ts) | Uses a mouse click on desktop and automatically calls Puppeteer's `page.tap` when the page is using a mobile-emulation viewport. |
| Click a thought or bullet by value | [`clickThought`](../src/e2e/puppeteer/helpers/clickThought.ts), [`clickBullet`](../src/e2e/puppeteer/helpers/clickBullet.ts) | Resolves the semantic target and performs an element click. Use `click` when the distinction between mouse and emulated touch input is under test. |
| Type text | [`keyboard.type`](../src/e2e/puppeteer/helpers/keyboard.ts) | Sends text through Puppeteer's keyboard API. |
| Press a key or shortcut | [`press`](../src/e2e/puppeteer/helpers/press.ts) | Presses a key with optional `alt`, `ctrl`, `meta`, and `shift` modifiers. |
| Swipe/command gesture | [`gesture`](../src/e2e/puppeteer/helpers/gesture.ts) | Emits `touchStart`, stepped `touchMove` events, and `touchEnd` for the supplied direction path or command gesture. |
| Long press | [`longPressThought`](../src/e2e/puppeteer/helpers/longPressThought.ts) | Holds a touch until the thought's bullet reports the long-press highlight, then releases. |
| Drag and drop | [`dragAndDropThought`](../src/e2e/puppeteer/helpers/dragAndDropThought.ts), [`dragAndDropFavorite`](../src/e2e/puppeteer/helpers/dragAndDropFavorite.ts), [`dragAndDrop`](../src/e2e/puppeteer/helpers/dragAndDrop.ts) | Drives real mouse down/move/up input and waits for drag-specific visible conditions. |
| Scroll | [`scroll`](../src/e2e/puppeteer/helpers/scroll.ts), [`scrollBy`](../src/e2e/puppeteer/helpers/scrollBy.ts), [`scrollIntoView`](../src/e2e/puppeteer/helpers/scrollIntoView.ts), [`scrollTo`](../src/e2e/puppeteer/helpers/scrollTo.ts) | Scrolls the window or a named container; use the narrowest helper that expresses the intent. |
| Emulate a mobile device | [`emulate`](../src/e2e/puppeteer/helpers/emulate.ts) | Applies a Puppeteer device profile before touch-specific input. |

Per-feature waiters include [`waitForEditable`](../src/e2e/puppeteer/helpers/waitForEditable.ts), [`waitForAlertContent`](../src/e2e/puppeteer/helpers/waitForAlertContent.ts), [`waitForContextHasChildWithValue`](../src/e2e/puppeteer/helpers/waitForContextHasChildWithValue.ts), and [`waitForThoughtExistInDb`](../src/e2e/puppeteer/helpers/waitForThoughtExistInDb.ts). Every Puppeteer test should read as a sequence of these helpers.

The most important helper is [`exportThoughts`](../src/e2e/puppeteer/helpers/exportThoughts.ts), which hits a backdoor on `window.em` to pull the entire current thought tree as the same outline format `importToContext` accepts. Asserting against the exported text is far faster, more readable, and more stable than parsing the DOM.

### `src/e2e/iOS/helpers/` — for WebdriverIO tests

The iOS suite has a separate driver vocabulary in [`../src/e2e/iOS/helpers/`](../src/e2e/iOS/helpers): [`tap`](../src/e2e/iOS/helpers/tap.ts) emits a W3C pointer action, [`keyboard.type`](../src/e2e/iOS/helpers/keyboard.ts) uses WDIO `sendKeys`, and [`gesture`](../src/e2e/iOS/helpers/gesture.ts) emits a touch pointer path. Helpers such as [`tapReturnKey`](../src/e2e/iOS/helpers/tapReturnKey.ts), [`hideKeyboardByTappingDone`](../src/e2e/iOS/helpers/hideKeyboardByTappingDone.ts), and [`showEditMenu`](../src/e2e/iOS/helpers/showEditMenu.ts) cross into native iOS UI when Web content APIs are insufficient.

Do not import Puppeteer helpers into iOS tests or assume identical driver behavior. Keep the test vocabulary parallel at the level of user intent, not implementation.

## Test Flags

[testFlags](../src/e2e/testFlags.ts) are used to alter runtime behavior of the app during tests. This is generally forbidden, as the automated test environment should be as close as possible to production so that it is testing the same behavior the end user sees. But there are some conditions that are difficult or impossible to create through normal user behavior (e.g. network latency) or that can enhance test readability (e.g. visualizations) when runtime alteration is warranted.

### Thoughtspace storage

Puppeteer preloads `testFlags.thoughtspaceStorage` before the application starts. Browser tests use in-memory storage by default, while persistence-specific suites call `usePersistentTreecrdtStorage` to use OPFS. The application entry point passes the selected storage explicitly to `initialize`, defaulting to persistent storage when no test override is present.

Test durable persistence in a regular browser context. Private browsing storage is temporary: Safari Private Browsing falls back to memory and loses thoughts on reload, while Chromium Incognito keeps OPFS only until the private session ends.

### Drag-and-drop visualization

You can enable drop target visualization boxes by running `em.testFlags.simulateDrop = true` in the JS console or setting `testFlags.simulateDrop` to true in [src/e2e/testFlags.ts](../src/e2e/testFlags.ts).

<img width="320" height="314" alt="Screenshot 2025-12-24 16 01 49" src="https://github.com/user-attachments/assets/9072a8d2-1324-41fb-9487-8f4f2c1165f2" />

## Regression Tests

Every bug fix ships with an automated test. Start from the verified reproduction, but do not treat an exploratory transcript as a test verbatim:

1. Choose the lowest test level that still covers the failure. Preserve browser/device behavior or input mapping only when it is relevant to the bug.
2. Keep the essential, reachable preconditions and the real production trigger. Remove diagnostic probes, exploratory detours, and setup already owned by the test fixture.
3. Assert the issue's **Expected Behavior**, never its buggy **Current Behavior**. The same assertion should be red before the fix and green afterward; do not invert it between phases.
4. If several reported triggers share one root cause, cover one representative trigger. Add another case only when it protects a distinct code path or risk.
5. Reuse the production interaction helpers from the reproduction rather than reimplementing their event or gesture logic.

Know what the fixture supplies. Do not repeat app launch, navigation, tutorial dismissal, state reset, or cleanup already guaranteed by the runner. Repeating fixture work adds noise and can create a second, subtly different setup path.

If the assertion target has no semantic locator, follow [Principle 8](#8-select-by-meaning-not-structure). A new `data-testid` is a last-resort, behavior-neutral test hook: make it minimal and additive, and do not combine it with styling or product changes. Adding the hook enables the test; it is not the bug fix.

### A red test must fail for the right reason

A pre-fix failure is evidence only when arrange and act complete and the **intended assertion** fails with an actual value that matches the reproduced bug. A timeout, missing selector, setup exception, infrastructure error, or failure at a different assertion does not prove that the test captures the bug.

When the failure is wrong, fix the test—not the application—and rerun it against the unfixed code until it reaches the intended assertion. Only then implement the fix. Afterward, rerun the unchanged assertion and confirm it passes.

## CI workflows

The primary Test, Puppeteer, and BrowserStack workflows run on pushes to `main` and on pull requests (BrowserStack uses `pull_request_target`). The TDD workflow runs on pull requests that add tests. All four accept `workflow_dispatch` with an optional `rerun_id` so the `ghworkflow` shell function (see [Tips](#triggering-github-actions-workflows-manually)) can fan out manually triggered runs for flake hunting.

#### Path filtering

Test, Puppeteer, BrowserStack, and Vercel Preview each carry the same `paths-ignore` filter, covering two groups:

- **Documentation and agent/editor configuration** — `**/*.md`, `docs/`, `.github/instructions/`, `.github/skills/`, `.claude/`, `.agents/`, `.vscode/`, `.hooks/`.
- **Native platform projects** — `android/`, `ios/`, `desktop/`, and `assets/` (the icon and splash sources generated into the first two).

A change set confined to those paths cannot affect what any of the four workflows tests: `yarn build` is web-only (`build:packages`, `build:styles`, `vite build`), `yarn test` reads only `src/`, and BrowserStack exercises mobile Safari over a tunnel rather than the Capacitor app. None of the native directories contains a JS or TS file, and the web favicons come from `public/`, not `assets/`. **If a Capacitor asset is ever wired into the Vite build, the native entries must be removed** — otherwise a real change would ship untested.

Because `paths-ignore` skips a workflow outright, **no check is reported at all** rather than a skipped or passing one. That is only viable while these are not required status checks on `main`; making any of them required again would leave filtered pull requests waiting on a check that never arrives. **Lint is deliberately left unfiltered and required**, so every pull request — including a documentation-only one — still reports exactly one check.

TDD needs no filter: its `detect` job already finds no changed tests in such a pull request and skips on its own. A run is skipped only when *every* changed file matches, so any pull request that also touches app or test code runs everything in full.

#### Superseded runs

Path filtering decides which runs start; concurrency decides which of them are worth finishing. When a pull request is pushed to twice in quick succession only the newer run's result is ever read, so Test, Puppeteer, Lint, TDD, and Vercel Preview each cancel the run they supersede. The first four carry this block:

```yml
concurrency:
  group: ${{ github.workflow }}-${{ github.event_name == 'pull_request' && github.ref || github.run_id }}
  cancel-in-progress: true
```

**The group key is per-trigger, not copyable between workflows.** For a `pull_request` workflow, `github.ref` is `refs/pull/<n>/merge` and is already per-pull-request. Vercel Preview cannot use it: `pull_request_target` sets `github.ref` to the base branch, which would put every open pull request in one group, so it keys on `github.event.pull_request.number` instead. Check the trigger before reusing either form.

**Only pull-request runs are grouped.** Every other event falls back to `github.run_id`, which is unique per run and so never collides. This is not the same as `cancel-in-progress: false`: a *shared* group with cancellation off queues runs instead, and GitHub cancels a pending run when a newer one queues behind it — the reason BrowserStack also sets `queue: max`. Two things depend on non-pull-request runs neither cancelling nor queueing: each push to `main` needs its own result to identify the commit that broke the build, and the `ghworkflow` flake hunt ([Tips](#triggering-github-actions-workflows-manually)) fans out many `workflow_dispatch` runs on a single ref that must all actually run.

**Cancelling does not strand the required check.** A cancelled run reports `cancelled`, not `success`, and Lint is the one required status check on `main`. It still cannot block a merge, because branch protection evaluates the checks on the pull request's *head* commit and only a superseded commit's run is ever cancelled — the head commit's run always finishes, since nothing supersedes it. This is the opposite of the `paths-ignore` hazard above, where the check that would gate the merge is never reported at all.

Downstream workflows already tolerate it: [`Puppeteer Diff Comment`](../.github/workflows/puppeteer-diff-comment.yml) acts only on a `success` or `failure` conclusion, so a cancelled run posts nothing from its partial artifacts.

BrowserStack is the one exception: it queues rather than supersedes, for the reason in its table note below. TDD's iOS job runs against the same BrowserStack account from a *different* group, so it contends for that shared session cap either way — cancelling a superseded TDD run only reduces the draw on it.

| Workflow | File | What it runs | Notes |
|---|---|---|---|
| **Test** | [`.github/workflows/test.yml`](../.github/workflows/test.yml) | `yarn test` (Vitest unit + jsdom) | The fast tier. Should always pass. Filtered by `paths-ignore` (see above). |
| **Puppeteer** | [`.github/workflows/puppeteer.yml`](../.github/workflows/puppeteer.yml) | `yarn test:puppeteer` against a `browserless/chrome:latest` service container on port 7566. | On failure, image-snapshot diffs are uploaded in the `__diff_output__` artifact. |
| **BrowserStack** | [`.github/workflows/ios.yml`](../.github/workflows/ios.yml) | `yarn test:ios` (an alias of `test:ios:browserstack`) against real iOS devices via BrowserStack. | Uses `pull_request_target` so credentials are available, guarded by `changed_files > 0` and `paths-ignore`, serialized repo-wide, and deduplicated per PR (see [Layered BrowserStack concurrency](#layered-browserstack-concurrency)). |
| **TDD** | [`.github/workflows/tdd.yml`](../.github/workflows/tdd.yml) | Runs newly added unit, Puppeteer, and iOS tests against the selected pre-fix commit. | Expects the new regression test to fail before the fix. Pull requests only. |

When a Puppeteer snapshot test fails on a pull request, the [`Puppeteer Diff Comment`](../.github/workflows/puppeteer-diff-comment.yml) workflow safely publishes the diff images to the `snapshot-diffs` branch and upserts a PR comment with the affected files and targeted `yarn test:puppeteer -u ...` command. The raw `__diff_output__` artifact is also available from the workflow run. Locally, the diff path is printed in the test runner output. See [Visual snapshot tests](#visual-snapshot-tests).

#### Layered BrowserStack concurrency

BrowserStack has two concurrency requirements that no single group can satisfy: usage must be serialized repo-wide (queue, never cancel — the shared parallel-session pool over-subscribes otherwise), while commits to the same pull request must supersede each other (cancel, never queue — only the newest head is worth a device session). GitHub allows an independent concurrency group at the workflow level and the job level, so [`ios.yml`](../.github/workflows/ios.yml) uses one of each:

- **Workflow level — per-PR superseding.** Each pull request gets its own group with `cancel-in-progress: true`, so a new commit cancels the PR's previous run whether it is still queued or already mid-suite. Non-PR runs (pushes to `main`, `workflow_dispatch`) get a unique group per run: every `main` commit should be tested, and `ghworkflow` fans out dispatch runs deliberately for flake hunting, so none of these may cancel each other.
- **Job level — the repo-wide `browserstack` gate** on the `run` job, with `cancel-in-progress: false` and `queue: max`, so runs from different sources queue without being dropped. A run waiting at this gate holds no runner. A queued run routinely waits 30–50 minutes here.

Two consequences of that wait are handled inside the `run` job, after the gate admits it — a job-level `if:` cannot handle either, because it is evaluated when the run is *created*, while the pull request is still open:

- **Merged or closed PRs cancel themselves.** The first step re-reads the pull request state and cancels its own run via the API if the PR is no longer open — a merge triggers the workflow's own `push` run on `main`, so re-testing the merged code would prove nothing while occupying the gate for a full suite. Cancelling rather than exiting green is deliberate: no test ran, so nothing may report as passed.
- **Checkout pins `github.event.pull_request.head.sha`, not the head branch name.** A branch name makes `actions/checkout` build a wildcard refspec, and a wildcard matching nothing makes `git fetch` exit non-zero with an **empty stderr** — so a branch deleted on merge used to fail the clone with a bare `The process '/usr/bin/git' failed with exit code 1`. A SHA is fetched exactly and stays reachable in the base repository via `refs/pull/<n>/head` after the branch is deleted (including for fork pull requests, which is why no `repository:` input is needed), keeping the checkout robust in the window between the cancel step's check and the fetch.

Accepted tradeoff: a suite cancelled mid-run leaves its BrowserStack session to expire on the provider's idle timeout instead of closing cleanly, briefly counting against the pool — cheaper than running entire suites against superseded commits.

Other workflows live in [`.github/workflows/`](../.github/workflows), including `lint.yml`, `docs.yml`, `update-browserslist.yml`, and `copilot-setup-steps.yml`. One of them is itself a test suite: `agent-scripts.yml` integration-tests the agent-session machinery, which otherwise runs only inside Copilot agent sessions, where a break like #4848 would ship unnoticed. [`scripts/shared-chrome.test.mjs`](../scripts/shared-chrome.test.mjs) launches the real [`scripts/shared-chrome.mjs`](../scripts/shared-chrome.mjs) and asserts its Chrome CDP endpoint answers; [`scripts/bridge-attach.test.ts`](../scripts/bridge-attach.test.ts) attaches to that Chrome through the real web executor bridge ([`attachExistingBrowserInstance.ts`](../src/e2e/puppeteer/attachExistingBrowserInstance.ts)) via `npx tsx`, the same invocation agents use; and [`scripts/mcp-session-proxy.test.mjs`](../scripts/mcp-session-proxy.test.mjs) runs the real [`scripts/mcp-session-proxy.mjs`](../scripts/mcp-session-proxy.mjs) against a local stub upstream — session adoption, DELETE swallowing, single canonical `Content-Length` — with no BrowserStack credentials. It is the one CI job that uses puppeteer's downloaded Chrome (every other workflow sets `PUPPETEER_SKIP_DOWNLOAD`), and it triggers on the scripts, their tests, the bridge modules, its own workflow file, and `yarn.lock` (a puppeteer bump is how #4848 arrived).

### TDD regression validation

When a pull request adds a regression test alongside a bug fix, it must satisfy the [regression-test design and failure gate](#regression-tests), then demonstrate both sides of the change:

1. It fails against the relevant pre-fix implementation.
2. It passes on the pull request.

The [`tdd-write-failing-test` skill](../.github/skills/tdd-write-failing-test/SKILL.md) temporarily stages the red test as `it.skip` with a bare issue-URL comment. Its focused `run-test` runner unskips the test for local validation, so a skipped test can never masquerade as a pass. The TDD workflow likewise unskips it against the pre-fix implementation and expects the valid assertion failure described above. After the fix, remove `.skip`; the normal Test/Puppeteer/BrowserStack workflow must run the unchanged assertion and pass. Never merge the transient skip.

The TDD workflow detects added `it(...)`/`test(...)` definitions in unit, Puppeteer, and iOS test files. It checks out the pre-fix implementation and overlays the changed test files — plus any changed test infrastructure they depend on (helpers, config/setup directories, and shared `src/e2e/*.ts` files) — from the pull request. For tests that are not staged with the transient skip, the normal workflows prove the green side separately.

By default, the pre-fix implementation is the PR's base commit. If the bug was introduced later or another commit is a better control, add this on its own line in the pull request description:

```text
/tdd <commit>
```

Use a skip label only when the test intentionally covers behavior that already works on the control commit:

- `skip-tdd` — skip all TDD validation.
- `skip-tdd-unit` — skip unit/store/JSDOM validation.
- `skip-tdd-puppeteer` — skip Puppeteer validation.
- `skip-tdd-ios` — skip BrowserStack iOS validation.

Test-only coverage pull requests with no application-code changes are skipped automatically. When a label is needed, it documents why a red pre-fix run is not expected; it must not be used merely to bypass a surprising failure.

## Reporting Bugs

### Issue Titles

If a bug is platform specific, put the platform in brackets at the beginning of the title. If the bug is on all platforms, the prefix can be omitted.

| Prefix                | Meaning                                                      |
|-----------------------|--------------------------------------------------------------|
| `[Mobile]`            | iOS / Mobile Safari / Android                                |
| `[iOS]`               | iOS / Mobile Safari                                          |
| `[iOS Capacitor]`     | iOS Capacitor build, but *not* Mobile Safari                 |
| `[Android]`           | Android                                                      |
| `[Chrome]`            | Desktop Chrome                                               |
| *(no prefix)*         | Issue present on all platforms                               |

### Headings

When reporting a bug, use these standard three headings: **Steps to Reproduce**, **Current Behavior**, and **Expected Behavior**. Describing something as "wrong", "not working", "broken", etc, is not sufficient. Broken behavior can only be understood in terms of the difference between current and expected behavior.

These headings should be populated as follows:

> ## Steps to Reproduce
>
> *Describe the exact steps needed for someone else to trigger the unexpected behavior.*
>
> ## Current Behavior
>
> *The current (wrong) behavior that is observed when the steps are followed. Typically this refers to the `main` branch. (When describing a regression in a PR, this can refer to the PR branch and should be accompanied by a commit hash for clarity.*
>
> *This should only describe the result of following the steps. Any conditions required to observe the behavior should go in Steps to Reproduce.*
>
> ## Expected Behavior
>
> *The expected (intended) behavior that should occur when the steps are followed. Typically this refers to the behavior that has not yet been implemented. (When describing a regression on a PR branch, this can refer to the existing, correct behavior on `main`.)*
>
> *Be specific.*
>
> *e.g.*
> - NO: ~~Should work correctly.~~
> - NO: ~~Thought should be expanded.~~
> - YES: `b` should be expanded.
>
> *Often the best approach is to state the expected specific behavior followed by the expected general behavior:*
> - `b` should be expanded.
> - Subthoughts with no siblings should be expanded.

Here's a real example from issue #2733:

> ## Steps to Reproduce
> ```
> - x
>   - b
>   - a
>   - =sort
>     - Alphabetical
>       - Desc
> ```
>
> 1. Set the cursor on `x`.
> 2. Activate New Subthought Above (Meta + Shift + Enter).
> 3. Move cursor up/down.
>
> ## Current Behavior
> * Cursor up moves the cursor from the empty thought to `a`.
> * Cursor down: Nothing happens.
>
> ## Expected Behavior
> * Cursor up should move the cursor from the empty thought to `x`.
> * Cursor down should move the cursor from the empty thought to `b`.

## Manual Test Cases

Various test cases that may need to be tested manually.

### Touch Events

- Enter edit mode ([#1208](https://github.com/cybersemics/em/issues/1208))
- Preserve editing: true ([#1209](https://github.com/cybersemics/em/issues/1209))
- Preserve editing: false ([#1210](https://github.com/cybersemics/em/issues/1210))
- No uncle loop ([#908](https://github.com/cybersemics/em/issues/908))
- Tap hidden root thought ([#1029](https://github.com/cybersemics/em/issues/1029))
- Tap hidden uncle ([#1128-1](https://github.com/cybersemics/em/pull/1128#pullrequestreview-654800218))
- Tap empty Content ([#1128-2](https://github.com/cybersemics/em/pull/1128#pullrequestreview-656073834))
- Scroll ([#1054](https://github.com/cybersemics/em/issues/1054))
- Swipe over cursor ([#1029-1](https://github.com/cybersemics/em/issues/1029#issuecomment-839718995))
- Swipe over hidden thought ([#1147](https://github.com/cybersemics/em/issues/1147))
- Preserve editing on switch app ([#940](https://github.com/cybersemics/em/issues/940))
- Preserve editing clicking on child edge ([#946](https://github.com/cybersemics/em/issues/946))
- Auto-Capitalization on Enter ([#999](https://github.com/cybersemics/em/issues/999))

### Autofocus

- Smoothly fade in/out thoughts ([#3588](https://github.com/cybersemics/em/issues/3588#issuecomment-3725211721))

### Render

Test `enter` and `leave` on each of the following actions:

1. New Thought
1. New Subthought
1. Move Thought Up/Down
1. Indent/Outdent
1. SubcategorizeOne/All
1. Toggle Pin Children
1. Basic Navigation


    ```
    - x
      - y
        - z
          - r
            - o
        - m
          - o
        - n
    ```

1. Word Wrap

    ```
    - a
      - This is a long thought that after enough typing will break into multiple lines.
      - forcebreakkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk
      - c
    ```

1. Toggle Table View

    ```
    - a
      - =view
        - Table
      - b
        - b1
      - c
        - c1
    ```

1. Table View - Column 2 Descendants

    ```
    - a
      - =view
        - Table
      - c
        - c1
          - c2
            - c3
    ```

1. Table View - Vertical Alignment

    ```
    - a
      - =view
        - Table
      - b
        - b1
        - b2
        - b3
      - c
        - c1
        - c2
        - c3
    ```

    ```
    - a
      - =view
        - Table
      - b
        - This is a long thought that after enough typing will break into multiple lines.
      - c
        - c1
    ```

    ```
    - a
      - =view
        - Table
      - This is a long thought that after enough typing will break into multiple lines.
        - b1
        - b2
      - c
        - c1
    ```

    ```
    - a
      - =view
        - Table
      - This is a long thought that after enough typing will break into multiple lines.
        - b1
        - b2
      - c
        - c1
    ```

1. Expand/collapse large number of thoughts at once

    ```
    - one
      - =children
        - =pin
          - true
      - a
        - =view
          - Table
        - c
          - c1
            - c2
              - c3
                - c4
        - This is a long thought that after enough typing will break into multiple lines.
          - b1
          - b2
        - oof
          - woof
      - x
        - =children
          - =pin
            - true
        - y
          - y1
        - z
    ```

1. Nested Tables

    ```
    - a
      - =view
        - Table
      - b
        - =view
          - Table
        - b1
          - x
        - b2
          - y
    ```

## Tips and Tricks

### Database operations and fake timers

`initStore` and `createTestApp` enable fake timers. When a test calls `initialize({ storage: 'memory' })` or performs database work directly, explicitly flush the resulting scheduled work before asserting:

```ts
vi.useFakeTimers()
await initialize({ storage: 'memory' })
await vi.runAllTimersAsync()
```

> It looks like we must use fake timers if we want the `store` state to be updated based on database operations (e.g., if we use `initialize({ storage: 'memory' })` to reload the state). I think this is because the `thoughtspace` operations are asynchronous and don't call the store operations prior to the test ending. (I'm not sure why we didn't get other errors that made this clear.)

https://github.com/cybersemics/em/pull/2741

In a rendered JSDOM test, wrap timer advancement that causes React updates in `act`.

### Triggering GitHub Actions workflows manually

In the event of a flaky GitHub Actions workflow, it can be useful to manually trigger multiple runs to flush out failures. The following shell function can be used to automate this process:

```sh
ghworkflow() {
  # get repo url
  repo_default=$(git remote get-url origin)
  workflow_default="puppeteer.yml"
  branch_default=$(git rev-parse --abbrev-ref HEAD)

  # prompt user for the repo
  read -p "Repository: ($repo_default) " input_repo
  repo=${input_repo:-$repo_default}

  # prompt the user for the workflow
  read -p "Workflow: ($workflow_default) " input_workflow
  workflow=${input_workflow:-$workflow_default}

  # prompt the user for the branch
  read -p "Branch: ($branch_default) " input_branch
  branch=${input_branch:-$branch_default}

  # prompt the user for the number of runs
  read -p "Number of runs: (10) " input_runs
  runs=${input_runs:-10}

  # To trigger the workflow on a PR from a fork, we need to push it to a repo we control.
  git push origin "$branch"

  for i in $(seq 1 $runs); do
    echo "Triggering workflow run #$i..."

    gh workflow run "$workflow" \
      --repo "$repo" \
      --ref "$branch" \
      --field rerun_id="run_$i"

    # avoid flooding GitHub API
    sleep 1
  done
}
```

Aside: `workflow_dispatch` must be enabled to allow manual workflow triggers.

This is already set on the Test, Puppeteer, BrowserStack, and TDD workflows. Other **em** workflows may use different triggers.

```yml
on:
  workflow_dispatch:
    inputs:
      rerun_id:
        description: 'Optional ID for tracking repeated runs'
        required: false
```

### Identifying regressions with git bisect

`git bisect` performs a binary search over a range of commits between a known good state (no bug) and a known bad state (bug) to efficiently find the first commit that introduced a regression. Identifying the exact commit will provide a vital clue about the cause of the bug and will inform the solution.

Finding the beginning of the search range is somewhat arbitrary. If you know that a regression was introduced very recently, sometimes you can just go back a few weeks. Otherwise you should go back far enough to ensure that you find the good commit (before the regression was introduced). I recommend 1–2 years. It’ll quickly pare down when the search space is cut in half each time (i.e. log2 of n, where n is the number of commits). Any longer than a couple years and the codebase will have changed so much that it will be slow/difficult to install old versions of everything and recreate the environment. If the regression is that old, it probably requires approaching it as a novel bug anyway as the code has changed so much, it would be impossible to `git revert`.

Once you identify the good commit (hopefully on the first attempt), run `git bisect good` and git will take over from there, automatically checking out the next commit until it has narrowed down the source of the problem.

Your only job at each step is:

1. `yarn install`
2. Restart dev server if halted.
3. Test for the regression.
4. Run `git bisect bad` if the regression is still present and `git bisect good` if it is gone.

Record the commit hash it gives you at the very end and you’ve found the source of the regression! Often I take one more step of testing the bad commit again and the commit right before it (should be good) just to be extra sure. If any good/bad determination was mistaken along the way then it will throw off the whole process and the final result will not be accurate. But if you are precise and methodical, you can search through hundreds of commits in a matter of minutes to find the offending commit.