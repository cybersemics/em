---
name: interaction-ios-select-text
description: >-
  Select a word inside an em editable on iOS App Automate so the native
  `Cut | Copy | Paste` edit menu appears and `window.getSelection()` reflects
  the word. Use when an iOS issue's repro depends on having text selected
  within a thought (formatting commands, edit-menu-driven flows, drag-blocking,
  etc.). Composes on top of `browser-control-ios-touch-fallback` for the
  underlying touch dispatch.
allowed-tools:
  - bash
  - wdio
---

Selecting text inside an em editable on iOS is **one gesture we know the standard wdio MCP tools can't deliver**. `mobile: doubleTap`, `mobile: tapWithNumberOfTaps`, W3C `performActions`, and `tap_element` called twice in succession all _blur_ the editable instead of selecting — WebKit's select-word recognizer rejects their synthetic touches. The only working path is `/touch/perform` (the legacy JSONWP TouchAction endpoint), which dispatches through XCUICoordinate.tap — the same code path that real finger touches take.

This skill is the recipe for that case. The underlying touch dispatch lives in [`browser-control-ios-touch-fallback`](../browser-control-ios-touch-fallback/SKILL.md); this skill orchestrates focus, coordinates, and verification.

---

## Prerequisites

- An iOS App Automate session is running (set up by [`browser-control-ios`](../browser-control-ios/SKILL.md)).
- The session ID has been saved to `/tmp/em-bs-session.txt` (the touch-fallback skill consumes it from there).
- `BROWSERSTACK_USERNAME` and `BROWSERSTACK_ACCESS_KEY` are in env.

---

## Recipe

Four steps. **Re-check coordinates between every step that changes focus** — em's React layout shifts the editable by ~26 px when the keyboard opens or closes.

### 1. Focus the target editable

Tap the editable once in the standard MCP way to place a caret and bring up the keyboard. You may use `tap_element` with a selector if the editable has one you can target, or `mobile: tap` at the editable's web-rect center.

```ts
// in webview context
execute_script({
  script: `var e = document.querySelector('[data-editable]');
           var r = e.getBoundingClientRect();
           return JSON.stringify({ cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2) })`,
})
// then:
switch_context('NATIVE_APP')
tap_element({ x: cx, y: cy })
```

Verify the field is focused (`document.activeElement` has `data-editable`, keyboard is up — `data-editing=true`):

```ts
execute_script({
  script: `var ae = document.activeElement;
           return JSON.stringify({
             active: ae?.getAttribute && ae.getAttribute('data-editable') != null ? 'EDITABLE' : ae?.tagName,
             editing: !!document.querySelector('[data-editing=true]')
           })`,
})
```

### 2. Re-fetch the editable's center coordinates (critical)

The keyboard opening shifts the layout. Coords from step 1 are now stale. Fetch fresh ones from the focused-state rect:

```ts
execute_script({
  script: `var e = document.querySelector('[data-editable]');
           var r = e.getBoundingClientRect();
           return JSON.stringify({ cx: Math.round(r.x + r.width/2), cy: Math.round(r.y + r.height/2) })`,
})
```

For a typical em thought with the keyboard open, you'll see `cy` change from ~138 (blurred) to ~164 (focused) — proof the layout shift happened.

### 3. Dispatch the native double-tap via the touch-fallback skill

Two `tap` actions with a 100 ms gap. **Use the freshly-fetched `(cx, cy)` from step 2** — not the values from step 1.

```bash
.github/skills/browser-control-ios-touch-fallback/touch-perform.sh \
  '[{"action":"tap","options":{"x":'$CX',"y":'$CY'}},
    {"action":"wait","options":{"ms":100}},
    {"action":"tap","options":{"x":'$CX',"y":'$CY'}}]'
```

Expected: `{"value":null}` (success). The script exits non-zero and prints the error otherwise.

### 4. Verify the selection

```ts
execute_script({
  script: `var s = window.getSelection();
           return JSON.stringify({ sel: s.toString(), selType: s.type, rangeCount: s.rangeCount })`,
})
```

Expected: `sel` is the word (e.g. `"Pineapple"`), `selType: "Range"`, `rangeCount: 1`. On the device, you'll see blue selection handles around the word and the native edit menu showing `Cut | Copy | Paste | Replace…`.

If `selType` is still `Caret` or `None`, see **Failure modes** below.

---

## Failure modes

- **Keyboard closes / `active=BODY` after step 3.** Tapped outside the word — usually stale coords from step 1. Make sure step 2 ran _after_ the focus tap; re-fetch and retry.
- **Edit menu shows `Paste / Select / Select All` instead of `Cut / Copy / Paste`.** The two taps were interpreted as separate single taps, not a double-tap (gap too large, or `press/release` used instead of `tap`). Confirm you're using the `tap` action type and a 100 ms gap.
- **`touch-perform.sh` exits with `Session not started or terminated`.** BrowserStack session expired or idled out. Restart via `start_session` (see `browser-control-ios`), update `/tmp/em-bs-session.txt`, retry.
- **`touch-perform.sh` exits with "BROWSERSTACK_USERNAME ... must be set in env".** Creds not in the shell env. In the Copilot runner they come from GitHub Actions secrets via `copilot-setup-steps.yml`; locally, export them.

---

## Why a separate skill

The general "raw touch dispatch" mechanism is in `browser-control-ios-touch-fallback`. This skill is the policy on top: _for the specific task of selecting a word in em, here are the surrounding steps_ — focus first, refresh coords, dispatch the right action sequence, verify. The mechanism is reusable for future fallback recipes; this recipe is reusable as the canonical "select a word" pattern without re-deriving it.
