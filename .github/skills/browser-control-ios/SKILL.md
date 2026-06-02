---
name: browser-control-ios
description: >-
  iOS environment bring-up for driving the em Capacitor app on BrowserStack App
  Automate via the wdio MCP — native (XCUITest) AND web (WKWebView) in one
  session. Invoked by browser-control when the target is `ios`; not normally
  called directly.
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

This sub-skill drives the **em Capacitor app** on BrowserStack **App Automate** (Appium/XCUITest). This exposes both the native and web layers in one session. `browser-control` routes here when the target is `ios`.

## Model: prefer web, drop to native only when needed

em is a PWA, so **default to the web (WKWebView) context** for interaction — it's the same DOM as every other platform, so your repro stays cross-platform-consistent and a single `execute_script` is one round trip. Drop to the **native (XCUITest) context** only for:

- **system UI** that doesn't exist in the DOM — status bar, software keyboard, text-selection handles / edit menu, scroll physics, system dialogs, share sheet;
- **visual verification** — always use a native screenshot (full device screen), never a web-only one;
- cases where web-level interaction is genuinely buggy and you need to confirm at the native layer.

For "find and tap an element," stay in web — going native is slower, more brittle (predicate selectors), and needlessly platform-specific.

> **Autocorrect is unavailable** on shared BrowserStack devices (iOS Auto-Correction is off at the device level and can't be enabled in App Automate). Bugs that depend on the live autocorrect engine cannot be reproduced here — scope them out and escalate.

## Step 1: Open the App Automate session

Open the app session via the `wdio` MCP:

```ts
start_session({
  provider: 'browserstack',
  platform: 'ios',
  app: 'em-server-mode', // pre-warmed BrowserStack custom_id — see "App binary" below
  noReset: true,
  browserstackLocal: true,
  capabilities: {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': 'iPhone 15',
    'appium:platformVersion': '26',
    'appium:newCommandTimeout': 900,
    'bstack:options': {
      realMobile: 'true',
      appiumVersion: '2.0.0',
      local: true,
      idleTimeout: 900,
    },
  },
})
```

If a specific iOS version is requested in the issue body or the user's query, replace `platformVersion` and `deviceName` as specified.

`browserstackLocal: true` is required — the app's WKWebView loads the runner's dev server through the tunnel (see Step 2). Timeouts at 900 for the same reason as any BrowserStack iOS session; drop to 600 then 300 and report if a caps-validation error is returned.

### App binary

The session drives a pre-built **server-mode** build of **em**'s Capacitor app. The IPA file for this build is already uploaded to BrowserStack under the `custom_id` **`em-server-mode`**, so day-to-day web changes need no rebuild. Reference it by `custom_id`; do **not** rebuild the native app per run. If `start_session` fails with an app-not-found error, the pre-warmed app has lapsed (BrowserStack deletes apps 30 days after last use) — **escalate to the user** to re-upload it (they need to do it manually; there is no tooling to automatically build IPAs yet).

### Heartbeat

Immediately after `start_session` returns, capture the session ID. Save it to `/tmp/em-bs-session.txt` (the e2e bridge reads it from there — see **Driving em via the e2e bridge**) and start the heartbeat (it self-daemonizes — **no** trailing `&`):

```bash
echo "<session-id>" > /tmp/em-bs-session.txt
.github/skills/browser-control-ios/heartbeat.sh "<session-id>"
```

This heartbeat keeps the BrowserStack session alive, even during very long agent sessions. It pings the hub every 90s, logs to `/tmp/heartbeat-<id>.log`, self-exits after 3 consecutive failures, and appends BrowserStack's session post-mortem on give-up — the only post-hoc signal for why a session died.

## Step 2: Land in the webview context (the default lens)

The app launches and its WKWebView **auto-loads the dev server on launch** (its baked `server.url` points at the tunnel) — there is **no `navigate` step**.

1. **Warm + enter the webview context.** `get_contexts` returns `["NATIVE_APP", "WEBVIEW_<id>"]` once the webview registers (a few seconds after launch). `switch_context` into the `WEBVIEW_*` entry. Doing this early also pays the **one-time cold webview-connect cost** up front (it can take tens of seconds); warm context swaps afterward are cheap (~one round trip).
2. **Wait for mount** — poll for `#skip-tutorial` or `[aria-label="empty-thoughtspace"]` before interacting (the React bundle hydrates after load). Poll agent-side with `execute_script` + a short `sleep` between calls.

From here, web interaction is identical to any other platform's DOM work — same selectors, same `execute_script`.

### execute_script script shape (wdio MCP on iOS) — mandatory

Two rules, both required (getting either wrong looks identical: `"Script executed successfully (no return value)"`):

1. **Start the body with `return`.** The MCP forwards `script` as a W3C function body; a bare expression (`() => …`) is defined and discarded, never invoked.
2. **Wrap the value in `JSON.stringify(<expr> ?? null)`.** The non-BiDi Appium-iOS path coerces non-primitive returns fragilely (empty arrays / plain objects / `undefined` collapse to `undefined` at the wire). A JSON string serialises reliably; `?? null` guarantees a real return value. `JSON.parse` the `Result:` payload agent-side.

For "wait until X" logic, poll agent-side: repeat `execute_script` with `return JSON.stringify(<predicate>)`, sleeping ~0.5s in Bash between calls.

### Console drain

If the build was compiled with `VITE_BROWSER_CONSOLE_CAPTURE=1` (the in-app console proxy, `src/util/consoleProxy.ts`), capture app-side console output after a touch-dispatching interaction:

```ts
execute_script({ script: 'return JSON.stringify(window.__drainConsoleProxy__?.() ?? null)' })
```

A `null` result means the proxy is **not** active in this build (it self-installs only when `VITE_BROWSER_CONSOLE_CAPTURE` is set at **build time**; the pre-warmed `em-server-mode` IPA is not currently built with it — unverified). If you get `null`, fall back to in-script error surfacing: `return JSON.stringify((function(){ try { return <expr> } catch (e) { return 'ERR:' + e.message } })())`.

### Interaction notes (web context)

- Use **`tap_element`**, not `click_element` (the WebDriver `element.click()` is silently ignored on iOS).
- **`tap_element` by selector when you can** — selectors are more robust against em's focus-driven layout shifts (the editable moves ~26 px when the keyboard opens). Coord-based `tap_element { x, y }` works fine for single taps. For em interactions (gestures, editing, selection, multi-touch) use the e2e helpers via the bridge — see **Driving em via the e2e bridge**. Prefer CSS / ID / `aria-label`; read `src/e2e/iOS/__tests__/` for the canonical em selectors rather than guessing.
- Expect **HMR reloads** when you edit source files — the page reloads on the device and in-memory app state (created thoughts, cursor, dismissed modals) resets. Re-run wait-for-mount and re-create state after edits.

## Driving em via the e2e bridge

em's own interactions — gestures, editing, text selection, thought manipulation — are driven by the **canonical e2e helpers** in `src/e2e/iOS/helpers/`, executed against this live session via `attachLiveSession()` in `src/e2e/iOS/agents.ts`. They are the same helpers the wdio suite uses; do not re-derive their logic in prose or inline (see `browser-control`'s "Driving em interactions").

**How it works.** `attachLiveSession()` (in `src/e2e/iOS/agents.ts`) `attach`es a WebdriverIO client to the live session (by the session id this skill saved to `/tmp/em-bs-session.txt` during bring-up), installs it as the global `browser` the helpers read, and switches into the WKWebView context. It attaches as a *second* client alongside the `wdio` MCP — both drive the same session.

**To run an interaction:**

1. Write a **temp** snippet — e.g. `/tmp/em-bridge.ts` — typed TypeScript that imports `attachLiveSession` and the helpers you need **by absolute path** (the repo root is your working directory), composes them inside an async `main()`, and prints any result as JSON. Glue only — call and compose helpers, never reimplement them. Wrap in `main()`; `tsx` runs the temp file as CommonJS, so top-level `await` is not available.

   ```ts
   import { attachLiveSession } from '<repo>/src/e2e/iOS/agents'
   import setSelection from '<repo>/src/e2e/iOS/helpers/setSelection'
   import showEditMenu from '<repo>/src/e2e/iOS/helpers/showEditMenu'

   const main = async () => {
     await attachLiveSession() // reads /tmp/em-bs-session.txt; BrowserStack creds from env
     const selection = await setSelection(0, 9)
     await showEditMenu()
     console.log(JSON.stringify({ selection }))
   }
   main().catch(e => { console.error(e); process.exit(1) })
   ```

2. Run it with `npx tsx /tmp/em-bridge.ts`. Read the JSON it prints, and capture a **native screenshot** to confirm any native UI (keyboard, selection handles, edit menu). The temp file is never committed — delete it when done.

**Common helpers** (`src/e2e/iOS/helpers/`): `newThought(value)`, `gesture(path)` (a gesture string like `'rd'` or a `gestures.*` entry), `setSelection(start, end)` (DOM range, any boundary), `showEditMenu()` (native `Cut | Copy | Paste` on the current selection), `getEditingText()`, `getSelection()`, `waitForEditable(value)`, `tap(handle)`.

**Cross-boundary conventions:** pass values, character offsets, and gesture strings — serializable data; element handles resolve in-process from a locator inside the helper. On iOS, gestures are gesture strings, never `Command` objects (the em command registry can't be imported outside the app runtime; the gesture handler resolves and executes the command from the replayed gesture).

**If no helper covers the interaction**, drive it directly with the `wdio` MCP (web context, or native when the model above calls for it) and keep going — reproduction is exploratory and must not be blocked. (Note the gap as a candidate helper for `src/e2e/iOS/helpers/` if you like, but don't wait on it.) Only avoid hand-reimplementing the internals of a helper that already exists.

## Native augmentation (drop down only when the model above calls for it)

`switch_context` to `NATIVE_APP` for system UI / visual verification, then switch back. Warm swaps are cheap.

- **Screenshots — always native.** A native device screenshot captures the full screen (status bar, keyboard, selection handles, gesture-menu overlay, system dialogs) that a web screenshot can't see, and it's **context-independent** (can grab screenshot without switching context). Capture one after native interactions, after web actions that can summon native UI (focus → keyboard, selection → menu), and whenever in iteration you feel you need visual context.
- **Always query the accessibility tree with scope.** Use `get_elements` with a **specific** `-ios predicate string` / class chain to find a target; don't dump the full tree (broad scans are slow). The native tree mirrors rendered web content, so some web facts are readable from native without switching — but for precise web work, use the DOM.
- **Text selection (select a word/span + the native `Cut | Copy | Paste` menu)** → `setSelection(start, end)` + `showEditMenu()` via the bridge (see **Driving em via the e2e bridge**). Selecting via the DOM and then tapping to reveal the menu works on Appium 2 **and** 3; do not use `mobile: doubleTap` / `performActions` to *select* — they blur the editable.
- **em gestures (including held gestures / the Gesture Menu)** → the `gesture` helper via the bridge, composing its hold option for held gestures — rather than hand-dispatching touches.

## If the session terminates mid-run

If a call fails with `Session not started or terminated …`, the BrowserStack session ended (the agent thought longer than the idle window, or a backend hiccup). This is recoverable:

1. **First**, capture and surface the heartbeat log (the only post-hoc diagnostic) as a Bash call: `cat /tmp/heartbeat-<OLD_SESSION_ID>.log`. Classify it: file missing → daemon died on launch; trailing `ping ok` near the death → BrowserStack-side kill (read the post-mortem reason); `ping FAIL` + `giving up` → heartbeat caught it.
2. Re-run Step 1 (`start_session` + heartbeat with the **new** ID) and Step 2 (re-enter webview + wait-for-mount). Continue. Do **not** switch MCPs — `wdio` is the only path to this session.

If the `wdio` MCP is not available, stop and report to the caller: iOS reproduction requires it. Do not fall back to Chrome with an iOS UA string — that exercises neither WebKit nor the native layer.

## Cleanup

No required cleanup — the wdio session terminates with the agent session. To start over mid-session: `close_session`, then re-run Step 1.
