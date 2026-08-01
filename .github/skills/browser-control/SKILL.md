---
name: browser-control
description: >-
  ALWAYS USE THIS SKILL to bring up a browser/app environment for a given target
  platform (web, android, or ios) before driving the em app. The caller (e.g.
  issue-repro) decides the platform and passes it in; this skill is a routing hub
  that delegates to the right platform sub-skill (browser-control-chrome or
  browser-control-ios).
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

The em app runs on the web, on Android (mobile Chrome), and on iOS (the Capacitor app on BrowserStack App Automate). This skill is the **entry point**: it takes the caller's target and brings up the right environment, delegating the platform specifics to a sub-skill so only the relevant detail loads.

| Target             | Handled by                         |
| ------------------ | ---------------------------------- |
| `web` (desktop)    | `browser-control-chrome` sub-skill |
| `android` (mobile) | `browser-control-chrome` sub-skill |
| `ios`              | `browser-control-ios` sub-skill    |

Use this skill **before any browser/app interaction** (navigation, evaluate, click, swipe, etc.). Going straight to a browser tool/MCP without routing through here leads to the wrong MCP being used, or the app loaded under the wrong profile and gestures not registering.

## Inputs

The caller must supply the target platform — one of `web`, `android`, or `ios`. This skill does **not** infer the platform from issues, tags, or body text; that is the caller's responsibility (see `issue-repro`).

If the caller has not stated a platform, stop and ask before doing anything. Picking a default would silently load the app under the wrong profile.

## Stages

1. **Probe** the dev server (shared, below).
2. **Bring up** the environment by invoking the right sub-skill for the target.

Once the sub-skill confirms the environment is up, the caller can drive it — see **Driving em interactions** below.

## Step 1: Probe the dev server

The runner's setup phase already started the Vite dev server. Verify it is responsive before bringing up any environment. Vite serves **HTTPS by default** (self-signed via `@vitejs/plugin-basic-ssl`); it only serves HTTP when started with `HTTP=1`. The `-k` flag accepts the self-signed dev cert:

```bash
curl -fsSk -o /dev/null https://localhost:3000 || curl -fsS -o /dev/null http://localhost:3000
```

If neither responds, check `/tmp/dev-server.log` and report — do not start a second instance. Note which scheme responded; the sub-skill may need it.

## Step 2: Route to the platform sub-skill

- `web` / `android` → invoke **`browser-control-chrome`**. It attaches the `chrome-devtools` MCP, applies mobile emulation for android, and navigates to the dev server.
- `ios` → invoke **`browser-control-ios`**. It opens the BrowserStack App Automate session (the Capacitor app, native + web), lands in the webview context, and waits for mount.

Hand the target to the sub-skill, wait for it to confirm the environment is ready, then hand back to the caller.

## Driving em interactions

Every interaction is one of two kinds — and the kind decides the tool:

- **Observing** em — reading state to figure out what's happening: `evaluate`/`execute_script`, inspecting the DOM, screenshots, console, network. Use the **full MCP/tool surface freely**; nothing is off-limits. Reproduction is exploratory.
- **Actuating** em — anything that *drives* its behaviour: tapping **any** em element (a thought, a button, a toolbar icon, a menu item), typing into a thought, gestures, text selection, thought manipulation. Actuation goes through the **canonical e2e helpers** in `src/e2e/<platform>/helpers` (run against the live session by the **executor bridge**) whenever one exists — they are the same helpers the e2e suite uses, so they encapsulate the dispatch detail that's easy to get wrong by hand, and a repro built from them transfers near-free into the automated test. Don't hand-reimplement the internals of a helper that already exists.

**Why actuation must use a helper — the trap that bites.** em's clickable controls use `fastClick`, which under mobile emulation listens for **touch** events. A raw mouse click — `page.click`, an MCP `click`, `elementHandle.click()` — **silently does nothing** on a touch-emulated page: no error, no effect, and you misread it as "the button is broken." The **`click` helper taps correctly per platform** (`page.tap` on mobile, `page.click` on desktop). Never actuate an em control with a raw click; use the helper.

- **A tap/click is not "mechanical" just because it's a tap.** If you're touching em's *own* UI — a thought, a toolbar icon, a dialog button — that's actuation → use the `click` helper (or a more specific helper). Check the catalog before assuming otherwise.
- **Compose** complex actions from simple helpers (e.g. "select a word and open its edit menu" = `setSelection(start, end)` + `showEditMenu()`; "tap Export" = `click('[data-testid="toolbar-icon"][aria-label="Export"]')`).
- **Find helpers by listing `src/e2e/<platform>/helpers/`** and reading the relevant helper's source for its signature — that directory is the catalog.
- **If no helper — and no composition — covers the actuation you need, drive it with the MCP/tooling and keep going.** No stopping, no escalation gate; reproduction must not be blocked by a missing helper. (Note the gap as a candidate helper, but don't wait on it.)
- **Genuinely mechanical operations** — navigating, screenshots, switching context, waiting for mount, scrolling the page, taps on **non-em system UI** (the on-screen keyboard's "Done", the OS share sheet) — use the tools directly. The test: em's own UI → actuation → helper; everything else → tools.

Platform specifics:

- **iOS** → run helpers via the bridge; see `browser-control-ios` ("Driving em via the e2e bridge").
- **web / android** → run helpers via the bridge; see `browser-control-chrome` ("Driving em via the e2e bridge").
