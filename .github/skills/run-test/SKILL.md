---
name: run-test
description: >-
  ALWAYS USE THIS SKILL to run a single e2e test in the real test harness for a
  given target platform — web/android (Vitest + puppeteer) or iOS (WDIO + Appium +
  simulator) — and report pass/fail with the failing assertion. Invoked by
  tdd-write-failing-test and by issue-repro's validation step.
allowed-tools:
  - bash
---

Runs **one** e2e test — a file, or a single `it` by name — in the project's real test harness and reports the result.

The test runs in the **Vitest / WDIO runner**, *not* through the `chrome-devtools` / `wdio` MCP or the executor bridge. Those drive the live interactive session for exploration; this is the deterministic harness the helpers were written for. (The two share the same helpers — that is the point — but the harness owns app launch, navigation, and per-test reset.)

**Inputs:** the **target platform** (`web`/`android` or `ios`) and the **test file** (optionally a single `it` name).

## web / android — Vitest + puppeteer

The puppeteer harness is **self-contained**: `test-puppeteer.sh` starts a browserless Chrome (docker, `:7566`) and its own vite dev server (`:2552`), then runs Vitest. Pass the spec path straight through:

```bash
# whole file
GITHUB_ACTIONS="" ./src/e2e/puppeteer/test-puppeteer.sh src/e2e/puppeteer/__tests__/<file>.ts

# a single test by name
GITHUB_ACTIONS="" ./src/e2e/puppeteer/test-puppeteer.sh src/e2e/puppeteer/__tests__/<file>.ts -t "<it name>"
```

**The `GITHUB_ACTIONS=""` prefix is required here.** The script only starts browserless + the `:2552` server when `GITHUB_ACTIONS` is unset; in real CI those are provided by the workflow, so it skips them. An agent runner sets `GITHUB_ACTIONS=true` (so the script would skip) but does **not** provide those services — the test would then fail connecting to `ws://localhost:7566`. Clearing the var **only for this command** makes the script self-provision; leave `CI` set (the harness still needs it). This mirrors the `puppeteer-update-snapshots` skill.

Prerequisite: **Docker** available (for browserless). The script manages the container and dev server itself — do not start your own, and do not point it at the shared `:9222` Chrome / `:3000` server used during exploration.

## iOS — WDIO + Appium

iOS tests run on **BrowserStack** real devices, exactly as iOS reproduction does (see `browser-control-ios`). **This is the path in the agent/Copilot environment — there is no local simulator there.** A local simulator is a local-developer convenience only.

### BrowserStack (default — and the only option in the agent environment)

Prerequisites the harness does **not** bring up (the agent environment already provides them): `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` in env, and the dev server on `:3000` (`yarn start`). The BrowserStack Local tunnel is managed automatically by `@wdio/browserstack-service` in the config — you do **not** start it yourself, and this is independent of the interactive session `browser-control-ios` opened (the runner starts its own).

Run a single spec:

```bash
yarn test:ios:browserstack --spec src/e2e/iOS/__tests__/<file>.ts
```

### Local simulator (local development only — NOT the agent environment)

Only when you have a booted simulator locally. Also needs Appium on `:4723` and the em app installed on the sim, plus the dev server on `:3000`:

```bash
IOS_DEVICE_NAME="iPhone 17 Pro" IOS_PLATFORM_VERSION="26.2" \
  yarn test:ios:local --spec src/e2e/iOS/__tests__/<file>.ts
```

`wdio.local.conf.ts` defaults to `iPhone 15 Plus` / `18.3`; override to match the booted sim (`xcrun simctl list devices booted`).

Either config clears storage and skips the tutorial before each test.

## Reading the result

Report pass/fail, and **on failure, classify it** — this distinction is what callers act on:

- **Assertion failure** — an `expect(...)` mismatch with an expected/received diff. A real behavioural result. Surface the exact expected and received values.
- **Infra error** — timeout, element/selector not found, session/driver error, harness or docker/Appium setup failure. *Not* a behavioural result; the test or the environment is wrong.

For `tdd-write-failing-test`'s "fail for the right reason" gate, **only an assertion failure on the intended expectation** counts as a valid pre-fix failure. An infra error means the test must be fixed and re-run, not that the bug is confirmed.
