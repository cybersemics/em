---
name: browser-control-ios
description: >-
  iOS environment bring-up for driving the em Capacitor app on BrowserStack App
  Automate — native (XCUITest) AND web (WKWebView) in one session. The session is
  created out of band of the wdio MCP (a Bash bring-up script), then driven by
  either wdio-MCP through a local shim or the e2e bridge/helper suite. Invoked by
  browser-control when the target is `ios`; not normally called directly.
allowed-tools:
  - bash
  - wdio
---

This sub-skill drives the **em Capacitor app** on BrowserStack **App Automate** (Appium/XCUITest). This exposes both the native and web layers in one session. `browser-control` routes here when the target is `ios`.

> **Transport model (read first).** The BrowserStack session lifecycle is **outside the MCP**: `bringup.sh` launches `scripts/start-ios-session.mjs`, which provisions the App Automate session and writes its id to `/tmp/em-bs-session.txt`. After that, two drivers can use the same live session:
>
> - **wdio-MCP** for interactive tool-by-tool driving. It connects to `scripts/mcp-session-proxy.mjs` on localhost; the shim makes `start_session` adopt the existing BrowserStack session instantly and forwards commands upstream over node:https (with a single canonical `Content-Length`).
> - **the e2e bridge** for canonical helper/test-suite interactions. `attachExistingSession()` reads the same session id and runs the repo's iOS helpers against the live session.
>
> Do **not** call wdio-MCP `start_session` directly against BrowserStack; that reintroduces slow provisioning inside the MCP call and can trip the MCP host timeout.

## Model: prefer web, drop to native only when needed

em is a PWA, so **default to the web (WKWebView) context** for interaction — it's the same DOM as every other platform, so your repro stays cross-platform-consistent and a single `browser.execute` is one round trip. Drop to the **native (XCUITest) context** only for:

- **system UI** that doesn't exist in the DOM — status bar, software keyboard, text-selection handles / edit menu, scroll physics, system dialogs, share sheet;
- **visual verification** — always use a native screenshot (full device screen), never a web-only one;
- cases where web-level interaction is genuinely buggy and you need to confirm at the native layer.

For "find and tap an element," stay in web — going native is slower, more brittle (predicate selectors), and needlessly platform-specific.

> **Autocorrect is unavailable** on shared BrowserStack devices (iOS Auto-Correction is off at the device level and can't be enabled in App Automate). Bugs that depend on the live autocorrect engine cannot be reproduced here — scope them out and escalate.

## Step 1: Bring up the App Automate session

Create the BrowserStack session with the bring-up script:

```bash
.github/skills/browser-control-ios/bringup.sh
```

This launches `scripts/start-ios-session.mjs` detached, which (1) starts a **BrowserStack Local** tunnel, (2) creates the App Automate session against the pre-warmed `em-server-mode` app with the iOS/XCUITest caps, and (3) holds the tunnel open for the run. The script writes the session id to `/tmp/em-bs-session.txt`; the wrapper polls for it, starts the **heartbeat**, and starts the **wdio-MCP shim** (`scripts/mcp-session-proxy.mjs`) automatically. On success it prints `iOS session ready: <id>` plus the `appiumConfig` to give to wdio-MCP; on failure it prints the bring-up log and exits non-zero.

To target a different device/OS, set env before the call:

```bash
EM_IOS_DEVICE='iPhone 15' EM_IOS_VERSION='17' .github/skills/browser-control-ios/bringup.sh
```

From here you can drive the live session either through **wdio-MCP** (interactive tool calls; see Step 2) or through the **e2e bridge** (canonical helper/test-suite snippets; see **Driving em via the e2e bridge**).

> **Why Bash, not direct wdio-MCP session creation?** BrowserStack provisioning a physical iPhone takes **~20–40s and varies** run to run (~17s device allocation/cleanup before Appium even starts, then a handshake; plus tunnel startup). In the Copilot cloud agent that can straddle the **MCP host's request timeout — which is fixed and NOT configurable** (the coding-agent `mcpServers` schema has no timeout field, and `@wdio/mcp` imposes none). Creating the session in a detached Bash process and polling a file sidesteps the host timeout entirely: the Bash tool's own timeout is generous and no MCP call sits in the provisioning critical path. wdio-MCP still uses `start_session`, but only against the local shim, where it returns immediately by adopting the already-created session.

### App binary

The session drives a pre-built **server-mode** build of **em**'s Capacitor app. The IPA file for this build is already uploaded to BrowserStack under the `custom_id` **`em-server-mode`** (override with `EM_IOS_APP`), so day-to-day web changes need no rebuild. Reference it by `custom_id`; do **not** rebuild the native app per run. If bring-up fails with an app-not-found error (in `/tmp/em-ios-bringup.log`), the pre-warmed app has lapsed (BrowserStack deletes apps 30 days after last use) — **escalate to the user** to re-upload it (they need to do it manually; there is no tooling to automatically build IPAs yet).

> **The pre-warmed IPA must be an HTTPS-aware build.** The dev server now serves HTTPS (self-signed). The server-mode build handles this with `DevServerViewController` (`ios/App/App/DevServerViewController.swift`), which accepts the self-signed cert at the WKWebView auth challenge, and a baked `server.url` of `https://bs-local.com:3000`. An IPA built **before** the HTTPS migration has an `http://…` `server.url` and will load nothing against the HTTPS-only dev server — the webview stays blank and wait-for-mount (Step 2) times out. If that happens, **escalate to the user to rebuild and re-upload `em-server-mode`** from an HTTPS branch (same manual rebuild path as above).

### Heartbeat

`bringup.sh` starts the heartbeat **automatically** once the session id lands (you don't run it by hand). It keeps the BrowserStack session alive during long agent sessions — pings the hub every 90s, logs to `/tmp/heartbeat-<id>.log`, self-exits after 3 consecutive failures, and appends BrowserStack's session post-mortem on give-up (the only post-hoc signal for why a session died). The session id is in `/tmp/em-bs-session.txt`, which the wdio-MCP shim and e2e bridge both read.

## Step 2: Connect a driver and land in the webview context

The app launches and its WKWebView **auto-loads the dev server on launch** (its baked `server.url`, `https://bs-local.com:3000`, reaches the runner's HTTPS dev server through the BrowserStack Local tunnel) — there is **no `navigate` step**. The self-signed dev cert is accepted by `DevServerViewController` inside the app, so — unlike the Safari E2E tests, which need a cloudflared CA-signed cert — no public tunnel is required here. (Agent-driven sessions don't set `TUNNEL_TOKEN`, so the dev server's token gate is inert and the app loads without a `?__token` param.) If the webview never mounts (blank page, Step 2 wait times out), suspect a pre-HTTPS IPA — see **App binary** above.

### Interactive driving via wdio-MCP

After `bringup.sh`, call wdio-MCP `start_session` against the local shim, **not** BrowserStack:

```json
{
  "provider": "local",
  "platform": "ios",
  "noReset": true,
  "appiumConfig": {
    "protocol": "http",
    "host": "127.0.0.1",
    "port": 4723,
    "path": "/wd/hub"
  }
}
```

The shim returns the existing BrowserStack session id and `(connected to running app)`. Then poll `get_contexts` until `WEBVIEW_*` appears and call `switch_context` to that context. It is normal for the first contexts call to return only `["NATIVE_APP"]`; the webview registers a few seconds after launch. Once in the webview, use wdio-MCP for exploratory reads, screenshots, context switches, and simple interactions.

If `switch_context` fails with an nginx HTML `400 Bad Request`, capture `/tmp/em-mcp-proxy.log` and stop. That means the shim's upstream forwarding path is broken; do not try to work around it by making raw WebDriver HTTP calls.

### Code/helper driving via the e2e bridge

The bridge enters the webview **for you**: `attachExistingSession()` switches into the `WEBVIEW_*` context after attaching (`browser.getContexts()` reports `["NATIVE_APP", "WEBVIEW_<id>"]` once the webview registers). Use this path when you need the canonical iOS e2e helpers or want to compose several interactions in one typed snippet. A minimal bring-up + wait-for-mount snippet:

```ts
// /tmp/em-mount.ts — run with: npx tsx /tmp/em-mount.ts
import { attachExistingSession } from '<repo>/src/e2e/iOS/attachExistingSession'

const main = async () => {
  const browser = await attachExistingSession() // attaches, then switches into the WEBVIEW context
  await browser.waitUntil(
    () => browser.execute(() => !!document.querySelector('#skip-tutorial, [aria-label="empty-thoughtspace"]')),
    { timeout: 60000, interval: 1000, timeoutMsg: 'app did not mount' },
  )
  console.log(JSON.stringify({ mounted: true }))
}
main().catch(e => {
  console.error(e)
  process.exit(1)
})
```

The first bridge attach pays a **one-time cold webview-connect cost** (tens of seconds); compose multiple interactions inside one snippet to amortize it. If the webview never mounts (blank page, the wait times out), suspect a pre-HTTPS IPA — see **App binary**. From here, web interaction is identical to any other platform's DOM work — same selectors, same `execute`.

### Reads and waits

In wdio-MCP, prefer the MCP tools directly after switching to `WEBVIEW_*`. In bridge snippets, `browser.execute(fn)` returns values **natively** (full WebdriverIO) — pass a real function and return a value directly. The wdio-MCP's iOS execute quirks (a `return`-prefixed string body, and wrapping in `JSON.stringify(<expr> ?? null)` to survive the non-BiDi wire) **do not apply to the bridge** — don't carry them over. For "wait until X" inside bridge snippets, use `browser.waitUntil(() => browser.execute(...))` rather than agent-side `sleep` loops.

### Console drain

If the build was compiled with `VITE_BROWSER_CONSOLE_CAPTURE=1` (the in-app console proxy, `src/util/consoleProxy.ts`), drain app-side console output after a touch-dispatching interaction, via wdio-MCP `execute` or the bridge:

```ts
const logs = await browser.execute(() => window.__drainConsoleProxy__?.() ?? null)
```

A `null` result means the proxy is **not** active in this build (it self-installs only when `VITE_BROWSER_CONSOLE_CAPTURE` is set at **build time**; the pre-warmed `em-server-mode` IPA is not currently built with it — unverified).

### Interaction notes (web context)

- **Tap, don't click** — the WebDriver `element.click()` is silently ignored on iOS. Use the `tap(handle)` helper (or a WebDriver touch action), not `element.click()`.
- **Tap by selector when you can** — selectors are more robust against em's focus-driven layout shifts (the editable moves ~26 px when the keyboard opens). Coordinate taps work fine for single taps. For em interactions (gestures, editing, selection, multi-touch) use the e2e helpers via the bridge — see **Driving em via the e2e bridge**. Prefer CSS / ID / `aria-label`; read `src/e2e/iOS/__tests__/` for the canonical em selectors rather than guessing.
- Expect **HMR reloads** when you edit source files — the page reloads on the device and in-memory app state (created thoughts, cursor, dismissed modals) resets. Re-run wait-for-mount and re-create state after edits.

## Driving em via the e2e bridge

em's own interactions — gestures, editing, text selection, thought manipulation — are driven by the **canonical e2e helpers** in `src/e2e/iOS/helpers/`, executed against this live session via `attachExistingSession()` in `src/e2e/iOS/attachExistingSession.ts`. They are the same helpers the wdio suite uses; do not re-derive their logic in prose or inline (see `browser-control`'s "Driving em interactions").

**How it works.** `attachExistingSession()` (in `src/e2e/iOS/attachExistingSession.ts`) `attach`es a WebdriverIO client to the live session (by the session id `bringup.sh` saved to `/tmp/em-bs-session.txt`), installs it as the global `browser` the helpers read, and switches into the WKWebView context. This is the **canonical helper/test-suite path**: use it when an existing e2e helper covers the interaction, or when a typed snippet is cleaner than several MCP calls.

> **Transport.** `attachExistingSession()` routes through the shim (`scripts/mcp-session-proxy.mjs` on `127.0.0.1:4723/wd/hub`, started by `bringup.sh`) **by default — you don't set anything**. The bridge→shim hop is localhost, which the sandbox never intercepts, and the shim forwards upstream over node:https with a single canonical `Content-Length`, sidestepping the firewall's duplicate-`Content-Length` bug that 400s undici POSTs. (`EM_BRIDGE_TARGET=browserstack` forces a direct connection — only for CI / local dev with no firewall; it will 400 in the sandbox.)

**To run an interaction:**

1. Write a **temp** snippet — e.g. `/tmp/em-bridge.ts` — typed TypeScript that imports `attachExistingSession` and the helpers you need **by absolute path** (the repo root is your working directory), composes them inside an async `main()`, and prints any result as JSON. Glue only — call and compose helpers, never reimplement them. Wrap in `main()`; `tsx` runs the temp file as CommonJS, so top-level `await` is not available.

   ```ts
   import { attachExistingSession } from '<repo>/src/e2e/iOS/attachExistingSession'
   import setSelection from '<repo>/src/e2e/iOS/helpers/setSelection'
   import showEditMenu from '<repo>/src/e2e/iOS/helpers/showEditMenu'

   const main = async () => {
     await attachExistingSession() // reads /tmp/em-bs-session.txt; routes through the shim by default
     const selection = await setSelection(0, 9)
     await showEditMenu()
     console.log(JSON.stringify({ selection }))
   }
   main().catch(e => {
     console.error(e)
     process.exit(1)
   })
   ```

2. Run it with `npx tsx /tmp/em-bridge.ts` (routes through the shim by default — see the Transport note above). Read the JSON it prints, and capture a **native screenshot** to confirm any native UI (keyboard, selection handles, edit menu). The temp file is never committed — delete it when done.

**Common helpers** (`src/e2e/iOS/helpers/`): `newThought(value)`, `gesture(path)` (a gesture string like `'rd'` or a `gestures.*` entry), `setSelection(start, end)` (DOM range, any boundary), `showEditMenu()` (native `Cut | Copy | Paste` on the current selection), `getEditingText()`, `getSelection()`, `waitForEditable(value)`, `tap(handle)`.

**Cross-boundary conventions:** pass values, character offsets, and gesture strings — serializable data; element handles resolve in-process from a locator inside the helper. On iOS, gestures are gesture strings, never `Command` objects (the em command registry can't be imported outside the app runtime; the gesture handler resolves and executes the command from the replayed gesture).

**If no helper covers the interaction**, either use wdio-MCP directly for exploratory tool-call driving, or drive it with the bridge's `browser` (raw WebdriverIO — `$`/`$$`, `execute`, touch actions, `switchContext`; web context, or native when the model above calls for it) inside the same snippet. Keep going — reproduction is exploratory and must not be blocked. (Note the gap as a candidate helper for `src/e2e/iOS/helpers/` if you like, but don't wait on it.) Only avoid hand-reimplementing the internals of a helper that already exists.

## Native augmentation (drop down only when the model above calls for it)

Use wdio-MCP `switch_context` or bridge `browser.switchContext('NATIVE_APP')` for system UI / visual verification, then switch back (to `WEBVIEW_*`). Warm swaps are cheap.

- **Screenshots — always native.** `browser.saveScreenshot('/tmp/em-shot.png')` captures the full device screen (status bar, keyboard, selection handles, gesture-menu overlay, system dialogs) that a web screenshot can't see, and it's **context-independent** (no need to switch context first). Capture one after native interactions, after web actions that can summon native UI (focus → keyboard, selection → menu), and whenever in iteration you feel you need visual context.
- **Always query the accessibility tree with scope.** Use `browser.$('-ios predicate string:…')` / a class chain with a **specific** predicate to find a target; don't dump the full tree (broad scans are slow). The native tree mirrors rendered web content, so some web facts are readable from native without switching — but for precise web work, use the DOM.
- **Text selection (select a word/span + the native `Cut | Copy | Paste` menu)** → `setSelection(start, end)` + `showEditMenu()` via the bridge (see **Driving em via the e2e bridge**). Selecting via the DOM and then tapping to reveal the menu works on Appium 2 **and** 3; do not use `mobile: doubleTap` / `performActions` to _select_ — they blur the editable.
- **em gestures (including held gestures / the Gesture Menu)** → the `gesture` helper via the bridge, composing its hold option for held gestures — rather than hand-dispatching touches.

## If the session terminates mid-run

If a call fails with `Session not started or terminated …`, the BrowserStack session ended (the agent thought longer than the idle window, or a backend hiccup). This is recoverable:

1. **First**, capture and surface the heartbeat log (the only post-hoc diagnostic) as a Bash call: `cat /tmp/heartbeat-<OLD_SESSION_ID>.log`. Classify it: file missing → daemon died on launch; trailing `ping ok` near the death → BrowserStack-side kill (read the post-mortem reason); `ping FAIL` + `giving up` → heartbeat caught it.
2. Re-run **Step 1** (`bringup.sh` — it mints a new session id, restarts the tunnel if needed, and starts a fresh heartbeat) and **Step 2** (re-attach + wait-for-mount). Continue.

Do not fall back to Chrome with an iOS UA string — that exercises neither WebKit nor the native layer.

## Cleanup

No required cleanup — the BrowserStack session ends with the agent session (and the bring-up process, which holds the BrowserStack Local tunnel, exits with it). To start over mid-session: kill the bring-up process (`pkill -f start-ios-session.mjs`) and re-run **Step 1**.
