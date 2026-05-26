---
name: browser-control-ios-touch-fallback
description: >-
  Fallback for iOS native touch dispatch when the wdio MCP's standard touch
  tools (`tap_element`, `swipe`, `drag_and_drop`, `mobile:` commands) produce
  the wrong behaviour for what a real finger would do. Posts the legacy JSONWP
  `/touch/perform` endpoint via curl. Use sparingly — only when a standard
  tool has visibly misfired, or for a recipe in the catalogue below.
allowed-tools:
  - bash
  - wdio
---

This skill is a **fallback**, not the default. The standard `wdio-mcp` touch tools (`tap_element`, `swipe`, `drag_and_drop`, and `mobile:` commands via `execute_script`) cover the overwhelming majority of iOS interactions and you should reach for them first. Drop down to this skill only when:

- A specific gesture is documented below in **Recipes** (e.g. double-tap-to-select).
- You tried a standard tool and the result was visibly wrong — the field blurred when you expected a selection, the gesture didn't register at all, the recognizer interpreted it as a different gesture than what a real finger would have produced.

The reason this layer exists at all: a few iOS WKWebView gesture recognizers (notably double-tap-to-select) reject the synthetic touches that `mobile: <cmd>` and W3C `/actions` dispatch — they only fire for touches delivered through XCUITest's `tap` primitive via the legacy JSONWP route.

---

## Mechanism

Appium-XCUITest still proxies the JSONWP **TouchAction** endpoint at `POST /session/{sid}/touch/perform`. It accepts a sequence of single-touch actions and dispatches them through XCUICoordinate, which iOS's recognizers honour.

A helper script encapsulates the auth, hub URL, and session-ID lookup so the agent only needs to pass the action sequence:

```bash
.github/skills/browser-control-ios-touch-fallback/touch-perform.sh '<actions JSON>'
```

`<actions JSON>` is the inner `actions` array — the wrapper `{"actions": …}` is added by the script.

---

## Inputs (already set up by `browser-control-ios` during bootstrap)

The helper reads these — `browser-control-ios` writes/exports them when the session is opened, so you shouldn't need to do anything yourself:

- **Session ID** at `/tmp/em-bs-session.txt`
- **`BROWSERSTACK_USERNAME`** and **`BROWSERSTACK_ACCESS_KEY`** in env (from GitHub Actions secrets in the Copilot runner)
- Hub URL — hard-coded in the helper

If any of these is missing the helper exits with a clear error; surface it rather than trying to recreate them here.

---

## Action primitives (verified)

| Action    | Body                                         | What it does                                |
| --------- | -------------------------------------------- | ------------------------------------------- |
| `tap`     | `{"action":"tap","options":{"x":N,"y":N}}`   | Atomic XCUICoordinate.tap at a screen point |
| `press`   | `{"action":"press","options":{"x":N,"y":N}}` | Touch-down at a screen point                |
| `wait`    | `{"action":"wait","options":{"ms":N}}`       | Pause                                       |
| `release` | `{"action":"release"}`                       | Touch-up matching the most recent `press`   |

**Likely supported but not verified on this stack:** `moveTo`, `longPress`, `cancel`. Probe before relying on them — they're standard JSONWP but the Appium-XCUITest proxy may not expose every one.

**Multi-touch** (pinch / two-finger tap) uses a separate endpoint, `/touch/multi/perform`, which is unverified here.

---

## Coordinates

`/touch/perform` consumes **native screen points**. For em's full-screen Capacitor webview on iPhone they happen to be **identity** with CSS-px coords from `getBoundingClientRect` (the WebView spans the full 393×852-point screen at origin (0, 0), `visualViewport.offsetTop/Left == 0`, `scale == 1`). So a `(cx, cy)` from web works as-is.

**Critical gotcha — re-fetch coordinates after every focus-state change.** When the iOS keyboard opens or closes, em's React layout shifts the editable by ~26 px (toolbar / safe-area adjustment driven by `state.isKeyboardOpen`). The same `data-editable` will have `cy=138` blurred and `cy=164` focused. Tapping the wrong frame's coords lands outside the word and blurs the field.

Pattern:

```js
// in webview context, via execute_script
var e = document.querySelector('[data-editable]')
var r = e.getBoundingClientRect()
return JSON.stringify({ cx: Math.round(r.x + r.width / 2), cy: Math.round(r.y + r.height / 2) })
```

Run this _after_ any tap that changes focus, before using the coords for the next gesture.

If the Capacitor app ever ships with the webview NOT full-screen, or visualViewport scale != 1, you'll need to add the WebView's native origin (query `//XCUIElementTypeWebView`) and account for `visualViewport.offsetLeft/offsetTop * scale`. Identity only holds while the WebView spans the screen.

---

## Recipes

### Double-tap-to-select a word

Verified: two `tap` actions, 100 ms gap, at the focused-state word center. iOS dispatches as a double-tap, WebKit's recognizer selects the word, and the native `Cut | Copy | Paste | Replace…` menu appears.

```bash
.github/skills/browser-control-ios-touch-fallback/touch-perform.sh \
  '[{"action":"tap","options":{"x":'$CX','"y":'$CY'}},
    {"action":"wait","options":{"ms":100}},
    {"action":"tap","options":{"x":'$CX','"y":'$CY'}}]'
```

The higher-level recipe (focus → re-fetch coords → dispatch → verify) lives in [`interaction-ios-select-text`](../interaction-ios-select-text/SKILL.md); reach for that one for the text-selection use case rather than calling this directly.

---

## Why not just use this for every touch?

Two reasons:

- **No selector form.** Every call needs an explicit `(x, y)`, which means an `execute_script` for `getBoundingClientRect` plus the curl — two calls instead of one `tap_element('#foo')`. The MCP's selector-based tools hide the coordinate-management cost.
- **Re-fetch burden.** Focus-state shifts mean stale coords from any prior call are dangerous. The fewer raw coordinate calls, the fewer chances to get this wrong.

Keep this as a fallback. The standard tools are faster, less brittle, and recognized in the same way for most gestures.
