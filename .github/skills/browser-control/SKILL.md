---
name: browser-control
description: >-
  ALWAYS USE THIS SKILL to bring up a browser environment for a given target
  platform (web, android, or ios) before driving the app. The caller (e.g.
  issue-repro) decides the platform and passes it in; this skill selects the
  right MCP, launches Chrome on demand, applies device emulation, and
  navigates to the dev server.
allowed-tools:
  - bash
  - chrome-devtools
  - wdio
---

The em app runs on the web, on Android (mobile Chrome), and on iOS Safari. The right way to drive a browser depends on which of those you are targeting:

| Target              | MCP             | How Chrome / Safari is launched                       |
|---------------------|-----------------|-------------------------------------------------------|
| `web` (desktop)     | `chrome-devtools` | First MCP call launches headless Chrome under Xvfb. |
| `android` (mobile)  | `chrome-devtools` | Same Chrome instance, with mobile device emulation. |
| `ios` (Safari)      | `wdio`           | `start_session` opens a remote iOS Safari session.   |

Use this skill **before any browser interaction** (navigation, evaluate, click, swipe, etc.). Calling browser tools without first running through this skill leads to the wrong MCP being used, or the page being loaded under the wrong device profile and gestures not registering.

## Inputs

The caller must supply the target platform — one of `web`, `android`, or `ios`. This skill does **not** infer the platform from issues, tags, or body text; that is the caller's responsibility (see `issue-repro` for an example of how an issue-driven caller does the detection).

If the caller has not stated a platform, stop and ask before doing anything. Picking a default would silently load the page under the wrong profile.

## Stages

1. **Bring up** the browser environment for the requested platform.
2. **Navigate** to the running dev server.

Once these stages complete, the caller can drive the browser. For touch gestures specifically, the caller should use the `interaction-gestures` skill — it tells you the right way to dispatch a gesture on each platform.

---

## Step 1: Bring Up the Environment

The runner's setup phase has already started Xvfb and the Vite dev server. Chrome is **not** pre-launched — it boots when the `chrome-devtools` MCP makes its first call. Do not start Chrome yourself; just call the MCP.

### Target = `web`

No emulation. The first `chrome-devtools` call (e.g. `navigate`) launches Chrome with a desktop default viewport (1280×1024 from Xvfb). Skip directly to Step 2.

### Target = `android`

Apply mobile emulation **before any `navigate` call** — the MCP keeps a persistent Chrome, so the first navigation must happen under the mobile profile or the initial render is wrong.

Call `chrome-devtools` `emulate` with a Pixel-class mobile profile:

- `viewport`: `412x915x2.625,mobile,touch` — Pixel 7 dimensions in CSS px, DPR 2.625. The `mobile` flag triggers mobile media queries; `touch` delivers touch events instead of mouse events.
- `userAgent`: a current mobile Chrome UA, e.g. `Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36`.

If you have already navigated by mistake, re-apply emulation and re-navigate so the page loads cleanly under the mobile profile.

### Target = `ios`

Open a remote iOS Safari session via the `wdio` MCP. The MCP's `platform: 'ios'` mode is wired for native apps and requires `appPath` / `app` / `noReset`. For a real iOS **Safari** session, use `platform: 'browser'` + `browser: 'safari'` and pass the iOS specifics through the `capabilities` escape hatch.

Call `start_session` with this shape (bump `deviceName` / `platformVersion` to whatever's current):

```ts
start_session({
  provider: 'browserstack',
  platform: 'browser',
  browser: 'safari',
  browserstackLocal: true,
  capabilities: {
    platformName: 'iOS',
    browserName: 'Safari',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': 'iPhone 15',
    'appium:platformVersion': '17',
    'bstack:options': {
      deviceName: 'iPhone 15',
      osVersion: '17',
      realMobile: 'true',
      appiumVersion: '2.0.0',
      local: true,
    },
  },
})
```

- `browserstackLocal: true` is the default for this skill. The wdio MCP launches the BrowserStack Local tunnel binary itself, so the remote device reaches the runner's `localhost:3000` via `bs-local.com:3000`. Without it the device cannot see the dev server.
- Do **not** call `launch_chrome` — that's for Chrome only.
- Do **not** call `emulate_device` on a real iOS Safari session; the device already serves the real iOS UA, viewport, and touch events.
- **Use only the `wdio` MCP for the rest of the iOS session.** Once a session is open, do not reach for `chrome-devtools`, `playwright`, or any other browser MCP — each manages its own browser instance and has no view of the iOS session. Tools like `playwright`'s `browser_wait_for` will return "no open pages" rather than do anything useful. Stay inside `wdio` for navigate, eval, screenshots, and waits.
- Use **`tap_element`, not `click_element`**, for element interactions. On iOS the WebDriver `element.click()` is silently ignored — `click_element` will appear to succeed but produce no effect. Default to `tap_element`.
- **`tap_element` by selector, never by coordinates, on BrowserStack iOS.** Coordinate-based `tap_element({ x, y })` fails with `Unhandled endpoint: /session/.../actions with method DELETE` — the W3C Actions API DELETE call isn't implemented on this Appium/BrowserStack stack. Use a CSS or attribute selector. If a selector path genuinely doesn't exist for the target, fall back to dispatching a synthetic `TouchEvent` via `execute_script` — the same touch-dispatch pattern `interaction-gestures` documents for swipes works for a single-point tap.
- **Prefer CSS / ID / `aria-label` selectors over text-content matching.** `tap_element({ selector: '#skip-tutorial' })` is reliable; partial-text-content forms like `tap_element({ selector: "*='New, empty thoughtspace'" })` often return "element wasn't found" — either because the resolver is stricter than wdio's full browser command, or because the element isn't rendered yet. The em app's major landmarks have stable IDs and `aria-label`s; when in doubt, read the existing iOS specs in `src/e2e/iOS/__tests__/` for the canonical selectors rather than guessing.
- After `start_session`, subsequent `navigate`, `tap_element`, `swipe`, `execute_script` operate on the open session. Do not start a new session per step — each `start_session` call closes the previous one.

If the wdio MCP is not available in this environment, stop and report back to the caller: iOS reproduction requires the wdio MCP. Do not attempt to fall back to Chrome with an iOS UA string — that does not exercise WebKit and will produce false reproductions.

---

## Step 2: Navigate to the Dev Server

The dev server starts during the runner's setup phase, but verify it is responsive before navigating. Vite may serve HTTP or HTTPS depending on local config (the `-k` flag accepts the self-signed dev cert):

```bash
curl -fsS -o /dev/null http://localhost:3000 \
  || curl -fsSk -o /dev/null https://localhost:3000
```

If neither responds, check `/tmp/dev-server.log` and report — do not start a second instance.

Note which scheme (HTTP vs HTTPS) responded. Then navigate using the MCP for your target:

- `web` / `android`: `chrome-devtools` `navigate` to `http://localhost:3000` (or `https://` if that is what responded).
- `ios`: `wdio` `navigate` to `http://bs-local.com:3000?__ios_console_proxy`. The `bs-local.com:3000` host is BrowserStack Local's well-known hostname — the tunnel started by `browserstackLocal: true` routes it back to the runner's `localhost:3000`. The `?__ios_console_proxy` query param activates the in-app console proxy (`src/util/iOSConsoleProxy.ts`) so console output is captured into `window.__iOSConsoleProxy__`. To read captured logs at any point: `execute_script(() => window.__drainiOSConsoleLogs__())` — atomically returns and clears the buffer.

If you encounter HTTPS self-signed certificate errors on Chrome, use the `thisisunsafe` bypass to proceed. On iOS Safari, accept the certificate via the wdio MCP's dialog handler if prompted.

### After navigate (iOS)

The React bundle hydrates a few seconds after `navigate` returns. Reaching for `tap_element` / `get_elements` immediately hits an empty `<div id="root"></div>` and burns round-trips on diagnostic poking before the agent realises the page just isn't ready yet. Wait for a known landmark before any interaction — `#skip-tutorial` for the welcome screen, `[aria-label="empty-thoughtspace"]` once the tutorial is dismissed:

```ts
// Single execute_script that polls in-page; resolves true when ready, false on 10s timeout.
execute_script(() => new Promise(resolve => {
  const check = () => {
    if (document.querySelector('#skip-tutorial, [aria-label="empty-thoughtspace"]')) return resolve(true)
    setTimeout(check, 100)
  }
  check()
  setTimeout(() => resolve(false), 10000)
}))
```

If the script returns `false`, drain `window.__drainiOSConsoleLogs__()` and check the dev server log before retrying — the page is genuinely stuck, not just slow.

**Drain the console at meaningful checkpoints** — after every `tap_element`, `swipe`, or any action whose effect isn't directly visible — by calling `execute_script(() => window.__drainiOSConsoleLogs__())`. Gesture-detector warnings, network errors, and React warnings live there and would otherwise be invisible to the agent. Before assuming a tap or swipe didn't register, drain first; the answer is often in the buffer.

After navigation, the environment is ready. Hand back to the calling skill.

---

## Cleanup

There is no required cleanup step. The Chrome instance and the wdio session both terminate with the agent session. If you need to start over with a clean profile mid-session:

- `web` / `android`: `localStorage.clear(); location.reload();` in the page console is normally enough. Re-apply `emulate` if you reset the Chrome profile.
- `ios`: call `wdio` `close_session` and then re-run Step 2 for `ios`.
