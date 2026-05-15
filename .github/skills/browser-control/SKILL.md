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

| Target             | MCP               | How Chrome / Safari is launched                     |
| ------------------ | ----------------- | --------------------------------------------------- |
| `web` (desktop)    | `chrome-devtools` | First MCP call launches headless Chrome under Xvfb. |
| `android` (mobile) | `chrome-devtools` | Same Chrome instance, with mobile device emulation. |
| `ios` (Safari)     | `wdio`            | `start_session` opens a remote iOS Safari session.  |

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
    'appium:newCommandTimeout': 900,
    'bstack:options': {
      deviceName: 'iPhone 15',
      osVersion: '17',
      realMobile: 'true',
      appiumVersion: '2.0.0',
      local: true,
      idleTimeout: 900,
    },
  },
})
```

Both timeouts are set to **900** — the maximum BrowserStack accepts for `idleTimeout` in practice, with `appium:newCommandTimeout` raised to match so the Appium-side timer doesn't fire before the BrowserStack-side one. The official capabilities reference still documents the range as 0–300 and the timeouts docs page shows `idleTimeout: 350` as an example, so neither page is authoritative; 900 is what works in real sessions. If a session is rejected at `start_session` with a caps validation error, drop back to 600 then 300 and report.

**Why this matters:** at 300s the session dies whenever the agent thinks for longer than the cap (large diffs, slow tool calls, sequential reads). The session loss is recoverable (see below), but losing the open page mid-investigation also loses any in-app state — created thoughts, cursor position, dismissed modals — and forces a re-navigation and wait-for-mount. 900 gives enough headroom that idle-timeout firing should be rare.

**Start the heartbeat** immediately after `start_session` returns, even though the cap is now 900s. The heartbeat is the safety net: it keeps the session warm in case a single agent turn ever stretches past the cap, and it provides the early-fail signal if the session dies for non-timeout reasons (BrowserStack-side hiccup, network blip). The wdio MCP's response includes the session ID — capture it and run:

```bash
.github/skills/browser-control/heartbeat.sh "<session-id>"
```

**Do not** add a trailing `&` — the script self-daemonizes (setsid + nohup) and the foreground call returns immediately with `[heartbeat] launched pid=… log=…`. This is deliberate: a bare `&` from a Bash tool call does **not** survive the tool call's shell exiting; that was the original "heartbeat there but session still died" bug. Trust the daemonized form.

The script pings the BrowserStack hub on launch, then every 90s thereafter, using the same `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` env vars as the wdio MCP. Each ping is `POST /session/<id>/execute/sync` with `{"script":"return 1","args":[]}` — a no-op JS round trip that exercises the full WebDriver → Appium → XCUITest → safaridriver → page bridge. Every ping (success or failure) is logged to `/tmp/heartbeat-<session-id>.log` with a UTC timestamp. The script self-exits after 3 consecutive failures, and on give-up it fetches BrowserStack's session post-mortem (`GET https://api.browserstack.com/automate/sessions/<id>.json`) and appends the JSON to the log so the death reason is concrete instead of inferred.

**Why these choices.** Earlier runs used `GET /session/<id>/url` every 240s on the theory that any W3C command would reset BrowserStack's idle timer and Appium's `newCommandTimeout`. Real-device iOS Safari sessions died ~2 minutes after a confirmed-alive ping despite `idleTimeout: 900` — either the cap is silently clamped lower on real devices, or the GET wasn't resetting the timer that actually kills the session. The current ping (a) shortens the interval so we sit inside any plausible sub-300s cap, and (b) forces an `execute/sync` round trip that's harder to ignore than a metadata read. If the symptom returns the post-mortem JSON in the log will tell us which path it took.

**If a session ever dies unexpectedly**, `cat /tmp/heartbeat-<session-id>.log` first. The log distinguishes:

- File missing or only `[heartbeat] launched…` line → the daemon died on launch. Likely env (`BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY` unset in the daemonized child), or `setsid`/`nohup` unavailable.
- File ends with periodic `ping ok status=200` lines, last one within ~90s of the session death → BrowserStack killed the session despite an active heartbeat. Read the trailing `browserstack session post-mortem: { … }` line for the official reason field — usually `BROWSERSTACK_IDLE_TIMEOUT`, `BROWSERSTACK_SESSION_LIMIT`, or a backend error. Escalate with that reason rather than guessing.
- File shows a run of `ping FAIL status=…` lines ending with `giving up` and a post-mortem line → session ended before the heartbeat's next ping, heartbeat correctly detected and stopped.

- `browserstackLocal: true` is the default for this skill. The wdio MCP launches the BrowserStack Local tunnel binary itself, so the remote device reaches the runner's `localhost:3000` via `bs-local.com:3000`. Without it the device cannot see the dev server.
- Do **not** call `launch_chrome` — that's for Chrome only.
- Do **not** call `emulate_device` on a real iOS Safari session; the device already serves the real iOS UA, viewport, and touch events.
- **Use only the `wdio` MCP for the rest of the iOS session.** Once a session is open, do not reach for `chrome-devtools`, `playwright`, or any other browser MCP — each manages its own browser instance and has no view of the iOS session. Tools like `playwright`'s `browser_wait_for` will return "no open pages" rather than do anything useful. Stay inside `wdio` for navigate, eval, screenshots, and waits.
- Use **`tap_element`, not `click_element`**, for element interactions. On iOS the WebDriver `element.click()` is silently ignored — `click_element` will appear to succeed but produce no effect. Default to `tap_element`.
- **`tap_element` by selector, never by coordinates, on BrowserStack iOS.** Coordinate-based `tap_element({ x, y })` fails with `Unhandled endpoint: /session/.../actions with method DELETE` — the W3C Actions API DELETE call isn't implemented on this Appium/BrowserStack stack. Use a CSS or attribute selector. If a selector path genuinely doesn't exist for the target, fall back to dispatching a synthetic `TouchEvent` via `execute_script` — the same touch-dispatch pattern `interaction-gestures` documents for swipes works for a single-point tap.
- **Prefer CSS / ID / `aria-label` selectors over text-content matching.** `tap_element({ selector: '#skip-tutorial' })` is reliable; partial-text-content forms like `tap_element({ selector: "*='New, empty thoughtspace'" })` often return "element wasn't found" — either because the resolver is stricter than wdio's full browser command, or because the element isn't rendered yet. The em app's major landmarks have stable IDs and `aria-label`s; when in doubt, read the existing iOS specs in `src/e2e/iOS/__tests__/` for the canonical selectors rather than guessing.
- After `start_session`, subsequent `navigate`, `tap_element`, `swipe`, `execute_script` operate on the open session. Do not start a new session per step — each `start_session` call closes the previous one.

If the wdio MCP is not available in this environment, stop and report back to the caller: iOS reproduction requires the wdio MCP. Do not attempt to fall back to Chrome with an iOS UA string — that does not exercise WebKit and will produce false reproductions.

### If the session terminates mid-run

If a tool call fails with `Session not started or terminated when running "execute/sync"` (or similar), the BrowserStack session ended — typically because the agent thought for longer than the idle window, or because of a transient backend hiccup. **This is recoverable, not a sign that the wdio MCP is broken.**

**Before** doing anything else (no investigation, no re-`start_session`, no MCP switching), you MUST capture the heartbeat log for the dead session and surface it in your output. This is the only diagnostic signal available inside a Copilot cloud agent run — there is no other way to tell why the session died after the fact:

```bash
echo "=== heartbeat log for dead session <OLD_SESSION_ID> ==="
cat "/tmp/heartbeat-<OLD_SESSION_ID>.log" 2>&1 || echo "(log file missing)"
echo "=== end heartbeat log ==="
```

Substitute `<OLD_SESSION_ID>` with the session ID you captured after the original `start_session`. Run this **as a Bash tool call** so its full output lands in the transcript — do not summarize it from memory. Then classify what the log shows using the three buckets in the heartbeat section above (file missing → daemon died on launch; trails `ping ok` near the death timestamp → BrowserStack-side kill; ends in `ping FAIL` + `giving up` → session died and heartbeat noticed). State which bucket fired in one line so a human reading the transcript later can pick up immediately.

Only **after** the log has been printed and classified, recover:

1. Call `start_session` again with the same caps.
2. Restart the heartbeat with the **new** session ID — the previous daemon has already self-exited (or will once it hits 3 fails).
3. Re-run Step 2 (navigate + wait-for-mount).
4. Continue from where you were. Do not switch MCPs — wdio is the only path to real iOS Safari, and chrome-devtools / playwright cannot reach this session.

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
- `ios`: `wdio` `navigate` to `http://bs-local.com:3000?__ios_console_proxy`. The `bs-local.com:3000` host is BrowserStack Local's well-known hostname — the tunnel started by `browserstackLocal: true` routes it back to the runner's `localhost:3000`. The `?__ios_console_proxy` query param activates the in-app console proxy (`src/util/iOSConsoleProxy.ts`) so console output is captured into `window.__iOSConsoleProxy__`. To read captured logs at any point: `execute_script({ script: 'return JSON.stringify(window.__drainiOSConsoleLogs__?.() ?? null)' })` — atomically returns and clears the buffer. The `JSON.stringify(… ?? null)` wrap is mandatory on this stack — see the script-shape rule in the post-navigate section.

If you encounter HTTPS self-signed certificate errors on Chrome, use the `thisisunsafe` bypass to proceed. On iOS Safari, accept the certificate via the wdio MCP's dialog handler if prompted.

### After navigate (iOS)

**`execute_script` script shape (wdio MCP on iOS).** Two rules, both required. Getting either wrong looks identical from the outside (`"Script executed successfully (no return value)"`), so apply both unconditionally.

**Rule 1 — start the body with `return`.** The MCP forwards the `script` string to WebdriverIO's `browser.execute`, which sends it straight to `/execute/sync` as the W3C-defined **function body** (wrapped in `function() { … }` server-side). A top-level `return` is valid and required:

| Form passed as `script:`                              | What runs                                                                            | Result                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------- |
| `() => doc.body.innerHTML.includes('editable')`       | Defines an arrow function as an expression statement and discards it. Never invoked. | `"Script executed successfully (no return value)"` |
| `return document.body.innerHTML.includes('editable')` | Returns the boolean — but on iOS see Rule 2 before trusting this.                    | varies                                             |

**Rule 2 — wrap the value in `JSON.stringify(<expr> ?? null)`.** This stack — `@wdio/mcp` → `webdriverio@9` non-BiDi → BrowserStack → Appium XCUITest → Safari iOS real device — has two well-documented hazards that hit the unwrapped-string path used by the MCP but **not** our e2e suite (which calls `browser.execute(fn)` and so gets WebdriverIO's polyfill+wrapping for free):

1. WebdriverIO 9 only injects its `webdriverioPolyfill` when the input is a function; strings are forwarded verbatim. Any reference inside the script to a hoisted helper the polyfill normally provides produces a `ReferenceError` the Selenium atom silently swallows, returning `value: undefined` ([webdriverio#13444](https://github.com/webdriverio/webdriverio/issues/13444)).
2. The Appium-remote-debugger `Runtime.evaluate` path coerces non-primitive return values fragilely on real iOS devices. Empty arrays, plain-object arrays, and `undefined` all collapse to `undefined` at the wire boundary ([appium#9107](https://github.com/appium/appium/issues/9107), [webdriverio#4515](https://github.com/webdriverio/webdriverio/issues/4515)). The MCP then prints both `undefined` and `null` as `"Script executed successfully (no return value)"`.

Returning a JSON string sidesteps both: primitives serialise reliably, and `?? null` ensures even a missing function or `undefined` produces a real return value rather than an empty wire frame. The canonical iOS shape is therefore:

```ts
execute_script({ script: 'return JSON.stringify(<expr> ?? null)' })
```

`JSON.parse` the `Result:` payload on the agent side. Interpret outcomes as:

| MCP returns                                      | Meaning                                                                                       |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `Result: <json>`                                 | Script ran. `JSON.parse` the payload to recover the value (`"null"` ⇒ `null` after parsing).  |
| `Script executed successfully (no return value)` | Script threw inside the atom (likely Rule 1 violation, or a `ReferenceError` from Rule 2 #1). |
| `Error executing script: …`                      | Pre-script parse error or transport-level failure. Read the message.                          |

If you see "no return value" on a script you believe is shaped correctly, the fast diagnostic is to swap the body for `return JSON.stringify((function () { try { return <expr> } catch (e) { return 'ERR:' + e.message } })())` once — that surfaces whatever the atom was swallowing.

WebdriverIO's `browser.execute` is documented as synchronous — don't return a Promise expecting it to be awaited. For "wait until X is true" logic, poll from the agent side: call `execute_script` repeatedly with a `return JSON.stringify(<predicate>)` body, sleeping ~500 ms between calls via the Bash tool, until truthy or a timeout fires.

The React bundle hydrates a few seconds after `navigate` returns. Reaching for `tap_element` / `get_elements` immediately hits an empty `<div id="root"></div>` and burns round-trips on diagnostic poking before the agent realises the page just isn't ready yet. Wait for a known landmark before any interaction — `#skip-tutorial` for the welcome screen, `[aria-label="empty-thoughtspace"]` once the tutorial is dismissed:

Poll agent-side, sleeping in Bash between calls:

```ts
// Each iteration — call execute_script with a JSON.stringify-wrapped predicate:
execute_script({
  script: 'return JSON.stringify(!!document.querySelector(\'#skip-tutorial, [aria-label="empty-thoughtspace"]\'))',
})
// Result is `Result: true` or `Result: false` — JSON.parse the payload.
// Then via Bash: sleep 0.5. Repeat up to ~20 iterations (~10s total). Stop on the first true.
```

If the predicate is still `false` after the timeout, drain the console buffer (see below) and check the dev server log before retrying — the page is genuinely stuck, not just slow.

**Drain the console after every interaction.** This is **mandatory**, not optional. After every `tap_element`, `swipe`, `execute_script` that dispatches touches, `location.reload()`, or any other action that interacts with the page, your **very next** `execute_script` call MUST be:

```ts
execute_script({ script: 'return JSON.stringify(window.__drainiOSConsoleLogs__?.() ?? null)' })
```

`JSON.parse` the `Result:` payload. **Drain even when your DOM-state predicate already told you the action "worked"** — the buffer contains gesture-detector warnings, network errors, React warnings, and app-side `console.warn`s explaining _why_ the next thing is about to fail. Without these the agent is debugging blind.

Rationale: in production agent runs we saw the agent skip drain entirely across ~40 `execute_script` calls because direct DOM predicates were answering its immediate questions. That's the wrong tradeoff — DOM tells you _what_ happened, console tells you _what the app complained about while it happened_. The cost of one drain call is ~200-500ms; the cost of missing a gesture-detector warning is debugging a failing test from a screenshot.

Interpret the parsed payload:

| Parsed value                                                         | Meaning                                                                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `[]`                                                                 | Buffer was empty. Action produced no console output — fine, continue.                                                                                         |
| `[{ level, message }, ...]`                                          | Each entry is one `console.<level>` call. Print them in your transcript so a human reading later can see the app-side signal.                                 |
| `null`                                                               | `window.__drainiOSConsoleLogs__` is undefined — proxy didn't install. Check that the URL still has `?__ios_console_proxy` after any reload, then re-navigate. |
| `"Script executed successfully (no return value)"` (raw MCP message) | The wrap itself failed — shouldn't happen with the `?? null` guard, but if it does, see Rule 1 / Rule 2 above.                                                |

**Expect HMR reloads when you edit source files.** Vite's hot-module-replacement reloads the page on the iOS device whenever a watched source file changes. The console proxy reinstalls automatically on reload (it's wired into `src/initialize.ts`), but **in-memory app state is gone** — any thoughts you created, cursor positions, modal dismissals, etc. will be reset. After editing source mid-session, re-run the wait-for-mount predicate and re-create any in-app state you need before continuing. Don't conclude HMR is broken just because the page looks different than you left it — that's the reload doing its job.

After navigation, the environment is ready. Hand back to the calling skill.

---

## Cleanup

There is no required cleanup step. The Chrome instance and the wdio session both terminate with the agent session. If you need to start over with a clean profile mid-session:

- `web` / `android`: `localStorage.clear(); location.reload();` in the page console is normally enough. Re-apply `emulate` if you reset the Chrome profile.
- `ios`: call `wdio` `close_session` and then re-run Step 2 for `ios`.
