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

Immediately after `start_session` returns, capture the session ID. Save it to `/tmp/em-bs-session.txt` (the `browser-control-ios-touch-fallback` skill reads it from there) and start the heartbeat (it self-daemonizes — **no** trailing `&`):

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
- **`tap_element` by selector when you can** — selectors are more robust against em's focus-driven layout shifts (the editable moves ~26 px when the keyboard opens). Coord-based `tap_element { x, y }` works fine for single taps; for multi-touch sequences (double-tap, custom timing) drop down to [`browser-control-ios-touch-fallback`](../browser-control-ios-touch-fallback/SKILL.md). Prefer CSS / ID / `aria-label`; read `src/e2e/iOS/__tests__/` for the canonical em selectors rather than guessing.
- Expect **HMR reloads** when you edit source files — the page reloads on the device and in-memory app state (created thoughts, cursor, dismissed modals) resets. Re-run wait-for-mount and re-create state after edits.

## Native augmentation (drop down only when the model above calls for it)

`switch_context` to `NATIVE_APP` for system UI / visual verification, then switch back. Warm swaps are cheap.

- **Screenshots — always native.** A native device screenshot captures the full screen (status bar, keyboard, selection handles, gesture-menu overlay, system dialogs) that a web screenshot can't see, and it's **context-independent** (can grab screenshot without switching context). Capture one after native interactions, after web actions that can summon native UI (focus → keyboard, selection → menu), and whenever in iteration you feel you need visual context.
- **Always query the accessibility tree with scope.** Use `get_elements` with a **specific** `-ios predicate string` / class chain to find a target; don't dump the full tree (broad scans are slow). The native tree mirrors rendered web content, so some web facts are readable from native without switching — but for precise web work, use the DOM.
- **Text selection (double-tap-to-select a word)** → use the [**`interaction-ios-select-text`**](../interaction-ios-select-text/SKILL.md) skill. It composes focus + coord re-fetch + a native double-tap (via the touch-fallback skill) + verification. The standard MCP touch tools (`mobile: doubleTap`, `tap_element` x/y, `performActions`) all **blur** the editable on this stack — WebKit's select-word recognizer only honours touches dispatched through the legacy JSONWP `/touch/perform` route.
- **Other iOS gestures where the standard MCP tools misbehave** (e.g. visibly wrong outcome vs a real finger) → fall back to the [**`browser-control-ios-touch-fallback`**](../browser-control-ios-touch-fallback/SKILL.md) skill, which posts raw JSONWP TouchAction sequences. Use it only when needed — it's slower per call and you have to manage coordinates yourself.
- **em gestures (native or held)** → use the **`interaction-gestures`** skill; it documents the native `performActions` dispatch (skipping the unsupported `releaseActions`/DELETE) and the synthetic-held technique for em's Gesture Menu.

## If the session terminates mid-run

If a call fails with `Session not started or terminated …`, the BrowserStack session ended (the agent thought longer than the idle window, or a backend hiccup). This is recoverable:

1. **First**, capture and surface the heartbeat log (the only post-hoc diagnostic) as a Bash call: `cat /tmp/heartbeat-<OLD_SESSION_ID>.log`. Classify it: file missing → daemon died on launch; trailing `ping ok` near the death → BrowserStack-side kill (read the post-mortem reason); `ping FAIL` + `giving up` → heartbeat caught it.
2. Re-run Step 1 (`start_session` + heartbeat with the **new** ID) and Step 2 (re-enter webview + wait-for-mount). Continue. Do **not** switch MCPs — `wdio` is the only path to this session.

If the `wdio` MCP is not available, stop and report to the caller: iOS reproduction requires it. Do not fall back to Chrome with an iOS UA string — that exercises neither WebKit nor the native layer.

## Cleanup

No required cleanup — the wdio session terminates with the agent session. To start over mid-session: `close_session`, then re-run Step 1.
