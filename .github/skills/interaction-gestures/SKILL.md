---
name: interaction-gestures
description: >-
  Use this skill when a step requires a swipe gesture in the em app's
  gesture zone. Tells you how to dispatch a multi-direction touch gesture on
  web/android (Chrome DevTools MCP) and on iOS (WebdriverIO MCP) so the gesture
  detector commits the expected command.
allowed-tools:
  - chrome-devtools
  - wdio
---

The em app interprets multi-direction swipes in the **gesture zone** as commands. A correctly-formed gesture is a single continuous touch with deliberate direction changes; the detector listens for `touchstart` → series of `touchmove` with direction transitions → `touchend`.

This skill assumes `browser-control` has already brought up the right MCP and applied any required device emulation. Do not call this skill on a desktop (mouse-only) profile — the detector requires touch events.

## Notation

Issues describe gestures in two interchangeable notations — both refer to the same thing:

| Notation | Example | Meaning                               |
| -------- | ------- | ------------------------------------- |
| Letters  | `rdr`   | `r`=right, `l`=left, `u`=up, `d`=down |
| Arrows   | `→↓→`   | `→`=r, `←`=l, `↑`=u, `↓`=d            |

## Gesture Zone

The gesture zone is the **left side** of the screen in right-handed mode (the default), **below the 50px toolbar**. Starting outside the zone or during the toolbar will not register. A starting point of `(150, 350)` in CSS px is comfortably inside the zone for a typical mobile viewport (Pixel 7 ~412×915, iPhone 14 ~390×844). Adjust if the issue calls for a different viewport.

## Gesture Cadence

The detector is unforgiving about timing. Use these parameters — they have been validated against `src/e2e/puppeteer/helpers/gesture.ts` and register reliably:

- **80px per direction**, broken into ~10px substeps.
- **~16ms between each `touchmove`** so the detector receives a steady stream rather than two endpoints.
- **40ms pause at each direction change** so the detector commits each leg before turning.
- **Hold ~80ms before `touchend`** so `onPanResponderRelease` fires with the full sequence intact.

Smaller distances or faster pacing will flash the gesture trace UI but fail to commit a command.

---

## Web / Android (Chrome DevTools MCP)

Dispatch synthetic touch events via `evaluate_script`. Do not try to use the mouse-emulation `click` tool — even with `touch` emulation on, an MCP-level `click` does not produce the continuous touch sequence the detector requires.

Working snippet — change `directions` to your gesture:

```js
;async () => {
  const directions = ['r', 'd'] // e.g. ['l','d','r','l','d','l'] for ldrldl
  const startX = 150,
    startY = 350,
    stepSize = 80,
    substep = 10
  const target = document.elementFromPoint(startX, startY) || document.body
  const mkTouch = (x, y) =>
    new Touch({
      identifier: 1,
      target,
      clientX: x,
      clientY: y,
      pageX: x,
      pageY: y,
      screenX: x,
      screenY: y,
      radiusX: 1,
      radiusY: 1,
      rotationAngle: 0,
      force: 1,
    })
  const fire = (type, x, y) => {
    const t = mkTouch(x, y)
    target.dispatchEvent(
      new TouchEvent(type, {
        cancelable: true,
        bubbles: true,
        composed: true,
        touches: type === 'touchend' ? [] : [t],
        targetTouches: type === 'touchend' ? [] : [t],
        changedTouches: [t],
      }),
    )
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms))
  let x = startX,
    y = startY
  fire('touchstart', x, y)
  await sleep(50)
  for (const dir of directions) {
    let dx = 0,
      dy = 0
    if (dir === 'r') dx = stepSize
    else if (dir === 'l') dx = -stepSize
    else if (dir === 'd') dy = stepSize
    else if (dir === 'u') dy = -stepSize
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / substep))
    for (let i = 1; i <= steps; i++) {
      x += dx / steps
      y += dy / steps
      fire('touchmove', Math.round(x), Math.round(y))
      await sleep(16)
    }
    await sleep(40)
  }
  await sleep(80)
  fire('touchend', Math.round(x), Math.round(y))
}
```

---

## iOS (WebdriverIO MCP)

The wdio MCP exposes a `swipe` tool, but it performs a single straight-line swipe per call. **Do not** call `swipe` once per direction for a multi-direction gesture — each call begins and ends its own touch, so the detector sees three separate one-direction swipes instead of one compound gesture, and no command will commit.

Instead, run the **same JS touch-dispatch snippet** above through the wdio MCP's `execute_script` tool. Mobile Safari supports `Touch` and `TouchEvent`, and the em gesture detector works the same way regardless of whether the touch comes from the OS or from `dispatchEvent`.

Two things to get right when crossing into the wdio MCP, both rooted in the fact that the MCP passes `script` straight through to WebdriverIO's `browser.execute` and the Appium iOS backend takes the non-BiDi path (see `browser-control`'s "execute_script script shape" subsection):

1. **Wrap the snippet as a `return`-ed IIFE, not a bare arrow function.** The snippet is `async () => { … }`. Sent as a plain script string, that defines an async arrow function as an expression statement and discards it — the gesture **never runs**. Wrap it:

   ```js
   return (async () => {
     // …entire snippet body from the Web/Android section…
   })()
   ```

   The IIFE invokes immediately, so the touch sequence starts dispatching. The leading `return` hands the Promise back to wdio so the W3C execute/sync call has a result to serialize.

2. **The Promise is not awaited.** WebdriverIO only awaits returned Promises on the BiDi path; Appium iOS is non-BiDi (`/execute/sync` returns the Promise object serialized, not its resolved value). The `execute_script` call returns within milliseconds while the gesture is still being dispatched in the page. After the call returns, sleep on the agent side via Bash for ~1.5 s (long enough for the longest gesture you dispatch, plus a small buffer) before validating; otherwise the validation step runs against pre-gesture state.

If a step truly is a single straight-line swipe (not an em command — e.g. scrolling a list, dismissing a sheet), the simpler `swipe` tool is fine.

### Adjusting starting coordinates on iOS

The 50px toolbar offset is the same on iOS Safari, but the safe-area insets at the top of the viewport mean a starting Y of 350 is safe across all current iPhones. If you change the viewport (rotate to landscape, etc.), recompute a start point that is inside the gesture zone for that viewport.

---

## Validating That a Gesture Registered

After dispatching, confirm the command actually committed before moving to the next step:

- Watch the UI for the expected state change (the command's effect — e.g. a thought was deleted, indented, exported).
- If nothing happens, check the console for warnings from the gesture detector. The most common causes are: starting outside the gesture zone, missing mobile emulation (web/android), or pacing too fast.
- A gesture trace that flashes briefly and then disappears with no command means the detector saw the touch but did not match a known sequence — usually a pacing issue.

Do not assume a gesture committed just because the tool call succeeded.
