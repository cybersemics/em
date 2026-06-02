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

The runner's setup phase already started the Vite dev server. Verify it is responsive before bringing up any environment. Vite may serve HTTP or HTTPS (the `-k` flag accepts the self-signed dev cert):

```bash
curl -fsS -o /dev/null http://localhost:3000 || curl -fsSk -o /dev/null https://localhost:3000
```

If neither responds, check `/tmp/dev-server.log` and report — do not start a second instance. Note which scheme responded; the sub-skill may need it.

## Step 2: Route to the platform sub-skill

- `web` / `android` → invoke **`browser-control-chrome`**. It attaches the `chrome-devtools` MCP, applies mobile emulation for android, and navigates to the dev server.
- `ios` → invoke **`browser-control-ios`**. It opens the BrowserStack App Automate session (the Capacitor app, native + web), lands in the webview context, and waits for mount.

Hand the target to the sub-skill, wait for it to confirm the environment is ready, then hand back to the caller.

## Driving em interactions

Drive em's own interactions — gestures, editing, text selection, thought manipulation — through the **canonical e2e helpers** in `src/e2e/<platform>/helpers`, executed against the live session by the **executor bridge**. These are the same helpers the e2e test suite uses, so they are the single source of truth for how the app is interacted with. Do **not** re-derive interaction logic (synthetic touch dispatch, gesture cadence, selection recipes) in prose or inline — that drift is exactly what this model removes.

- **Compose** complex actions from simple helpers (e.g. "select a word and open its edit menu" = `setSelection(start, end)` + `showEditMenu()`).
- **If no helper — and no composition of helpers — covers the em interaction you need: STOP.** Propose a new helper for `src/e2e/<platform>/helpers` (sketch its signature and which helpers it composes) and escalate it for review. Do not hand-roll the interaction inline. A missing helper is a gap to fill in the single source of truth, not a license to improvise.
- **Mechanical / system / browser operations are not em interactions** — navigation, screenshots, context switching, waiting for mount, native taps on system UI (keyboard "Done", share sheet), scrolling a list — and use the MCP tools directly. Reach for a helper only for em's own behaviour.

Platform specifics:

- **iOS** → run helpers via the bridge; see `browser-control-ios` ("Driving em via the e2e bridge").
- **web / android** → run helpers via the bridge; see `browser-control-chrome` ("Driving em via the e2e bridge").
