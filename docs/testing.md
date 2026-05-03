# Quick Start

```sh
yarn test            # unit and jsdom tests
yarn test:puppeteer  # puppeteer (docker required)
yarn test:ios        # webdriverio (browserstack account required)
```

# Stack

- Vitest
- JSDOM
- React Testing Library
- Puppeteer
- Browserless
- Docker
- WebdriverIO
- Github Actions

# Reporting Bugs

## Issue Titles

If a bug is platform specific, put the platform in brackets at the beginning of the title. If the bug is on all platforms, the prefix can be omitted.

| Prefix                | Meaning                                                      |
|-----------------------|--------------------------------------------------------------|
| `[Mobile]`            | iOS / Mobile Safari / Android                                |
| `[iOS]`               | iOS / Mobile Safari                                          |
| `[iOS Capacitor]`     | iOS Capacitor build, but *not* Mobile Safari                 |
| `[Android]`           | Android                                                      |
| `[Chrome]`            | Desktop Chrome                                               |
| *(no prefix)*         | Issue present on all platforms                               |

## Headings

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

# Test Levels

The project has multiple levels of automated testing, from single function unit tests up to realistic end-to-end (E2E) tests that run tests against an actual device or browser.

Use the lowest level that is sufficient for your test case. If your test case does not require a DOM, use a unit test. If it requires a DOM but is not browser or device-specific, use a React Testing Library (RTL) test. Higher level tests may provide a more realistic testing environment, but they are slower and, in the case of webdriverio on browserstack, cost per minute of usage.

### 1. Unit Tests

⚡️⚡️⚡️ 1–20ms each

Basic unit tests are great for testing pure functions directly.

Related tests: [actions](../src/actions/__tests__), [selectors](../src/selectors/__tests__), [util](../src/util/__tests__)

### 2. Store Tests

⚡️⚡️⚡️ 1–20ms each

The command tests require dispatching Redux actions but do not need a DOM. You can use the helpers `createTestStore` and `executeCommand` to operate directly on a Redux store, then make assertions about `store.getState()`. This allows commands to be tested independently of the user device.

Related tests: [commands](../src/commands/__tests__)

### 3. JSDOM Tests

⚡️⚡️ 1–1000ms each

Anything that tests a rendered component requires a DOM. If there are no browser or device quirks, you can get away with testing against an emulated DOM (`jsdom`) which is cheaper and faster than a real browser.

- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) (RTL)

Related tests: [components](../src/components/__tests__)

### 4. Puppeteer Tests

⚡️ 1–2s each

```sh
yarn test:puppeteer
```

Puppeteer is a Node.js library that provides a high-level API for controlling a Chromium-based browser (Chrome or Chromium) via the DevTools Protocol. It is maintained by the Chrome DevTools team and is primarily used for browser automation. We run ours in a Docker container to ensure consistent results on different dev machines and the CI.

Puppeteer allows you to launch a real browser instance (headless or visible), navigate to pages, interact with the DOM, execute JavaScript in the page context, capture screenshots or PDFs, and observe network or performance behavior programmatically.

Related tests: [/src/e2e/puppeteer](../src/e2e/puppeteer)

The Puppeteer tests are run via Vitest using the `puppeteer-e2e` project defined in [vitest.config.ts](../vitest.config.ts), which uses a custom [puppeteer-environment.ts](../src/e2e/puppeteer-environment.ts). The runner script lives at [src/e2e/puppeteer/test-puppeteer.sh](../src/e2e/puppeteer/test-puppeteer.sh) and starts the browserless container along with a dedicated Vite dev server on port 2552.

#### Tips

High level helper functions are available for executing common user interactions: [/src/e2e/puppeteer/helpers](../src/e2e/puppeteer/helpers)

Mobile devices can be emulated in puppeteer. This is good for testing non-platform specific mobile functionality, such as gestures. If you can test it with the Chrome Device Toolbar, you can emulate it in puppeteer.

```ts
  await page.emulate(KnownDevices['iPhone 15 Pro'])

  await swipe(newThoughtCommand, true)
  await keyboard.type('a')
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

When running the tests locally, a link to the visual diff will be output in your shell. When running the tests in GitHub Actions, the visual diff can be downloaded from the artifact link added to the test output under "Upload snapshot diff artifact":

<img width="587" alt="Screenshot 2024-11-08 at 11 30 25 AM" src="https://github.com/user-attachments/assets/8737a224-59b5-4736-99db-d9d9dacef0e3">

If you are absolutely sure that the change is desired, and your PR was supposed to change the visual appearance of **em**, then run the snapshot test with `-u` to update the reference snapshot.

### 5. WebdriverIO tests

⚡️ 1–2s each (but large overhead to start session)

```sh
# Run on BrowserStack
yarn run test:ios:browserstack

# Run on local Appium (requires local setup)
yarn run test:ios:local
```

Environment variables:

```
.env.test.local
BROWSERSTACK_USERNAME=your_username
BROWSERSTACK_ACCESS_KEY=your_access_key
```

WebdriverIO tests provide automated test coverage of actual iOS devices (among others) in the cloud with BrowserStack. This allows us to cover some of the trickiest platform-specific behaviors, such as browser selection and autoscroll.

`wdio` executes test suites with native `WebDriver` support via `@wdio/mocha-framework` and ` @wdio/browserstack-service` which is responsible for automatic tunnel, session, and credential management. `wdio` also provides lifecycle hooks that are very helpful for initiating a session more efficiently.

The configuration files live in [src/e2e/iOS/config](../src/e2e/iOS/config) and are divided between [wdio.base.conf.ts](../src/e2e/iOS/config/wdio.base.conf.ts) which contains common settings for iOS Safari testing, [wdio.browserstack.conf.ts](../src/e2e/iOS/config/wdio.browserstack.conf.ts) using `@wdio/browserstack-service` that creates an automatic tunnel with the cloud browserstack service, and [wdio.local.conf.ts](../src/e2e/iOS/config/wdio.local.conf.ts) for local Appium testing which is only used in case we need to run tests on a local iOS simulator.

wdio documentation:

- https://webdriver.io/docs/cli
- https://webdriver.io/docs/configurationfile
- https://webdriver.io/docs/browserstack-service

Related tests: [/src/e2e/iOS](../src/e2e/iOS)

## Vitest configuration

[`vitest.config.ts`](../vitest.config.ts) defines two projects, both extending [`vite.config.ts`](../vite.config.ts):

- **`unit`** — `jsdom` environment, picks up everything under `**/__tests__/**/*.ts` excluding `e2e/`. Setup files: [`vitest-localstorage-mock`](https://www.npmjs.com/package/vitest-localstorage-mock) (loaded first to ensure `localStorage` is defined in CI), then [`src/setupTests.js`](../src/setupTests.js). Used by `yarn test`.
- **`puppeteer-e2e`** — custom environment [`puppeteer-environment.ts`](../src/e2e/puppeteer-environment.ts), setup file [`puppeteer/setup.ts`](../src/e2e/puppeteer/setup.ts), only includes `src/e2e/puppeteer/__tests__/*.ts`. The `vite-plugin-terminal` plugin pipes `console.log` from the page back to the terminal so puppeteer test failures are debuggable. Used by `yarn test:puppeteer` (which also starts the Browserless container and a dedicated Vite dev server on port 2552, see [`test-puppeteer.sh`](../src/e2e/puppeteer/test-puppeteer.sh)).

iOS tests are not part of the Vitest config — they run under WDIO, see [WebdriverIO tests](#5-webdriverio-tests).

# Test Helpers

There are two helper directories. Use them before reaching for raw Redux dispatches or DOM queries.

## `src/test-helpers/` — for unit, store, and JSDOM tests

The helpers in [`../src/test-helpers/`](../src/test-helpers) cover store setup and operations that are otherwise verbose to write by hand:

- [`createTestApp`](../src/test-helpers/createTestApp.tsx) — mounts `<App />` into the JSDOM environment via `@testing-library/react`, runs `initialize()`, swaps in `react-dnd-test-backend`, opts into fake timers, and closes the welcome modal. Use this when a test touches the rendered app. Pair every call with `cleanupTestApp` (it clears `localStorage`, the local YJS db, the store, and event handlers).
- [`initStore`](../src/test-helpers/initStore.ts) — initializes the store without mounting the React tree, for store-level tests that don't need a DOM.
- [`importToContext`](../src/test-helpers/importToContext.ts) — seeds the store with a tree from a multi-line plaintext outline (the same format the `Import` modal accepts). Most fixture setup goes through this.
- [`dispatch`](../src/test-helpers/dispatch.ts) — a thin wrapper that lets a test dispatch synchronously without re-typing `store.dispatch(...)` plumbing.
- **Operate-by-value helpers.** Where a test would otherwise need to look up a `ThoughtId` to dispatch an action, prefer the value-keyed variants:
  - [`newThoughtAtFirstMatch`](../src/test-helpers/newThoughtAtFirstMatch.ts), [`editThoughtByContext`](../src/test-helpers/editThoughtByContext.ts), [`moveThoughtAtFirstMatch`](../src/test-helpers/moveThoughtAtFirstMatch.ts), [`deleteThoughtAtFirstMatch`](../src/test-helpers/deleteThoughtAtFirstMatch.ts), [`addMulticursorAtFirstMatch`](../src/test-helpers/addMulticursorAtFirstMatch.ts).
- **Read-by-value helpers.** [`getAllChildrenByContext`](../src/test-helpers/getAllChildrenByContext.ts), [`getChildrenRankedByContext`](../src/test-helpers/getChildrenRankedByContext.ts), [`getAllChildrenAsThoughtsByContext`](../src/test-helpers/getAllChildrenAsThoughtsByContext.ts), [`attributeByContext`](../src/test-helpers/attributeByContext.ts), [`contextToThought`](../src/test-helpers/contextToThought.ts).
- [`expectPathToEqual`](../src/test-helpers/expectPathToEqual.ts) — Jest matcher that compares paths by their thought *values* rather than ids, so test failures are readable.
- [`checkDataIntegrity`](../src/test-helpers/checkDataIntegrity.ts) — assertions that catch parent/child mismatches, missing Lexemes, and orphaned thoughts. Useful as a final assertion in mutation-heavy tests.
- [`dataProviderTest`](../src/test-helpers/dataProviderTest.ts) — the alternate `DataProvider` implementation used by tests that exercise the storage layer without going through Yjs. (See [persistence.md](persistence.md) for the live YJS provider.)

## `src/e2e/puppeteer/helpers/` — for puppeteer tests

[`../src/e2e/puppeteer/helpers/`](../src/e2e/puppeteer/helpers) contains the user-action helpers: `click`, `tap`, `type`, `swipe`, `scrollUp`, `clickThought`, `clickBullet`, `keyboardShortcut`, `dragAndDrop`, `dragAndDropFavorite`, plus per-feature waiters like `waitForCommandUniverse`, `waitForContextHasChildWithValue`, `waitForEditable`. Every puppeteer test should be a sequence of these helpers — composing them gives readable, user-centric tests.

The most important helper is [`exportThoughts`](../src/e2e/puppeteer/helpers/exportThoughts.ts), which hits a backdoor on `window.em` to pull the entire current thought tree as the same outline format `importToContext` accepts. Asserting against the exported text is far faster, more readable, and more stable than parsing the DOM. It is the only sanctioned backdoor; everything else should go through user-facing affordances.

# Test Flags

[testFlags](../src/e2e/testFlags.ts) are used to alter runtime behavior of the app during tests. This is generally forbidden, as the automated test environment should be as close as possible to production so that it is testing the same behavior the end user sees. But there are some conditions that are difficult or impossible to create through normal user behavior (e.g. network latency) or that can enhance test readability (e.g. visualizations) when runtime alternation is warranted.

## Drag-and-drop visualization

You can enable drop target visualization boxes by running `em.testFlags.simulateDrop = true` in the JS console or setting `testFlags.simulateDrop` to true in [src/e2e/testFlags.ts](../src/e2e/testFlags.ts).

<img width="320" height="314" alt="Screenshot 2025-12-24 16 01 49" src="https://github.com/user-attachments/assets/9072a8d2-1324-41fb-9487-8f4f2c1165f2" />

# CI workflows

Three GitHub Actions workflows run on every push to `main` and every pull request. All three accept `workflow_dispatch` with an optional `rerun_id` so the `ghworkflow` shell function (see [Tips](#triggering-github-actions-workflows-manually)) can fan out manually-triggered runs for flake hunting.

| Workflow | File | What it runs | Notes |
|---|---|---|---|
| **Test** | [`.github/workflows/test.yml`](../.github/workflows/test.yml) | `yarn test` (Vitest unit + jsdom) | The fast tier. Should always pass. |
| **Puppeteer** | [`.github/workflows/puppeteer.yml`](../.github/workflows/puppeteer.yml) | `yarn test:puppeteer` against a `browserless/chrome:latest` service container on port 7566. Image-snapshot diffs are uploaded as a `snapshot-diff` artifact when tests fail. | The slow tier. Triggered only when changed-files > 0. |
| **BrowserStack** | [`.github/workflows/ios.yml`](../.github/workflows/ios.yml) | `yarn test:ios:browserstack` against real iOS devices via BrowserStack. | Trigger is `pull_request_target` (so credentials can be exposed to the workflow), guarded by `changed_files > 0`. |

Other workflows live in [`.github/workflows/`](../.github/workflows) — `lint.yml`, `tdd.yml`, `docs.yml`, `update-browserslist.yml`, `copilot-setup-steps.yml` — but the three above are the test pipelines proper.

When a Puppeteer snapshot test fails, the visual diff is downloadable from the workflow run page; locally, the diff path is printed in the test runner output. See [Visual snapshot tests](#visual-snapshot-tests).

# Manual Test Cases

Various test cases that may need to be tested manually.

## Touch Events

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

## Autofocus

- Smoothly fade in/out thoughts ([#3588](https://github.com/cybersemics/em/issues/3588#issuecomment-3725211721))

## Render

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

# Tips and Tricks

## Database operations and fake timers

> It looks like we must use fake timers if we want the `store` state to be updated based on database operations (e.g., if we use `initialize()` to reload the state). I think this is because the `thoughtspace` operations are asynchronous and don't call the store operations prior to the test ending. (I'm not sure why we didn't get other errors that made this clear.)

https://github.com/cybersemics/em/pull/2741

```ts
// Use fake timers here to ensure that the store operations run after loading into the db
vi.useFakeTimers()
await initialize()
await vi.runAllTimersAsync()
```

## Triggering GitHub Actions workflows manually

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

This is already set on all the **em** workflows, so you shouldn't need to worry about it.

```yml
on:
  workflow_dispatch:
    inputs:
      rerun_id:
        description: 'Optional ID for tracking repeated runs'
        required: false
```

## Identifying regressions with git bisect

`git bisect` performs a binary search over a range of commits between a known good state (no bug) and a known bad state (bug) to efficiently find the first commit that introduced a regression. Identifying the exact commit will provide a vital clue about the cause of the bug and will inform the solution. 

Finding the beginning of the search range is somewhat arbitrary. If you know that a regression was introduced very recently, sometimes you can just go back a few weeks. Otherwise you should go back far enough to ensure that you find the good commit (before the regression was introduced). I recommend 1–2 years. It’ll quickly pare down when the search space is cut in half each time (i.e. log2 of n, where n is the number of commits). Any longer than a couple years and the codebase will have changed so much that it will be slow/difficult to install old versions of everything and recreate the environment. If the regression is that old, it probably requires approaching it as a novel bug anyway as the code has changed so much, it would be impossible to `git revert`.

Once you identify the good commit (hopefully on the first attempt), run `git bisect good` and git will take over from there, automatically checking out the next commit until it has narrowed down the source of the problem.

Your only job at each step is:

1. `yarn install`
2. Restart dev server if halted.
3. Test for the regression.
4. Run `git bisect bad` if the regression is still present and `git bisect good` if it is gone.

Record the commit hash it gives you at the very end and you’ve found the source of the regression! Often I take one more step of testing the bad commit again and the commit right before it (should be good) just to be extra sure. If any good/bad determination was mistaken along the way then it will throw off the whole process and the final result will not be accurate. But if you are precise and methodical, you can search through hundreds of commits in a matter of minutes to find the offending commit.

# Best Practices

- Avoid coupling Puppeteer tests to Redux state or other implementation details.
   e.g.
   
   > The use of `em.testHelpers.getState` is tightly coupling the test to various parts of the Redux state (implementation details), which we really want to avoid. It's important that integration tests behave like a normal user and do not have access to what is "under the hood." 
   > 
   > The few times we add a backdoor in existing tests are as last resorts, when there is no other way to test something. Now that we have dedicated test engineers, we need to maintain high standards and work hard to promote separation of concerns and maintainability.
   
   https://github.com/cybersemics/em/pull/3172#discussion_r2274819907
- No arbitrary `sleep`; instead wait for a specific condition
   - https://github.com/cybersemics/em/pull/3163#discussion_r2261698577