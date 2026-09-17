---
title: "The position: fixed fallback must stay Mobile-Safari-only"
date: 2026-09-17
category: layout
module: virtual_keyboard
problem_type: ui_bug
component: frontend
symptoms:
  - Toolbar jitters while scrolling with the virtual keyboard open
  - Reproducible in the iOS Capacitor build only, never in Mobile Safari
  - No error, no warning, no failing test
  - Every consumer of usePositionFixed moves at once — toolbar, popups, hamburger menu
root_cause: platform_detection
resolution_type: code_fix
severity: high
tags:
  - ios-safari
  - capacitor
  - virtual-keyboard
  - position-fixed
  - toolbar
  - platform-gate
---

# The position: fixed fallback must stay Mobile-Safari-only

## Problem

Mobile Safari disables `position: fixed` while the virtual keyboard is up, so [`usePositionFixed`](../../../src/hooks/usePositionFixed.ts) re-implements it: `position: absolute` with `top` recomputed from `scrollTop` on every scroll frame. The hook's JSDoc (numbered concern 3) and its `visibleBottom` comments describe that emulation. What no comment records is why its trigger carries two platform checks rather than one.

```ts
const position = virtualKeyboard.open && isSafari() && !isCapacitor() ? 'absolute' : 'fixed'
```

[`isSafari`](../../../src/browser.ts) tests `navigator.vendor.includes('Apple')`, which is equally true inside the iOS Capacitor `WKWebView` — the vendor string belongs to WebKit, not to the browser. [`isCapacitor`](../../../src/browser.ts) is `Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android'`, so the pair reads *iOS Safari the browser, not either Capacitor app*. Delete `!isCapacitor()` as a redundant simplification and the native iOS build switches onto the scroll-driven absolute path with no other visible change.

The second half is load-bearing because the two platforms fail differently. Mobile Safari shrinks the **visual** viewport when the keyboard opens and leaves the **layout** viewport alone, so a fixed element stays pinned to a rectangle that is no longer what the user sees, and drifts as the page scrolls. The iOS Capacitor build configures the Keyboard plugin with `resize: 'none'` ([`capacitor.config.ts`](../../../capacitor.config.ts)), so the WebView never resizes at all — the same fact [`scrollCursorIntoView`](../../../src/device/scrollCursorIntoView.ts) has to compensate for in its own coordinates. The keyboard overlays a full-height viewport and `position: fixed` holds. Emulation there is not a fallback but a regression: a JS scroll handler repositioning an element the compositor was already keeping still.

The tree's own idiom invites the mistake. `isTouch && isSafari()` is the prevailing spelling — [`Editable`](../../../src/components/Editable.tsx), [`useEditMode`](../../../src/components/Editable/useEditMode.ts), [`FauxCaret`](../../../src/components/FauxCaret.tsx), [`HamburgerMenu`](../../../src/components/HamburgerMenu.tsx), and with `isiPhone` added in [`Bullet`](../../../src/components/Bullet.tsx), [`BulletPositioner`](../../../src/components/BulletPositioner.tsx) and [`calculateCursorOverlayRadius`](../../../src/util/calculateCursorOverlayRadius.ts) — and it means "iOS WebKit, Capacitor included", which [`formatSelection`](../../../src/actions/formatSelection.ts) says outright in a comment. `usePositionFixed` is the one place that must exclude Capacitor, and the only call site written as `isSafari() && !isCapacitor()`.

The store gives no help here any more. [`virtualKeyboardStore`](../../../src/stores/virtualKeyboardStore.ts) is written by two of the four handlers [`virtualKeyboardHandler`](../../../src/device/virtual-keyboard/index.ts) dispatches to — [`iOSSafariHandler`](../../../src/device/virtual-keyboard/handlers/iOSSafariHandler.ts) and [`iOSCapacitorHandler`](../../../src/device/virtual-keyboard/handlers/iOSCapacitorHandler.ts) — so `open` is true in the browser and in the native iOS app alike, where the `safariKeyboardStore` it replaced was only ever true in the browser. `open` now means "a virtual keyboard is up", nothing more; a consumer that wants "the *Mobile Safari* keyboard is up" supplies the platform gate itself. The only other reader today, `scrollCursorIntoView`, gates the other way round — `isIOS && isCapacitor()` — for its own reasons.

## Symptoms

One symptom, no error, one build. With the keyboard open, scrolling made the toolbar jitter instead of holding still:

1. Create a thought.
2. Keep the virtual keyboard open.
3. Scroll.

Mobile Safari looked correct throughout, because there the emulation does the job it was written for; only the Capacitor build was wrong. The toolbar was the surface reported, but everything that takes its position from the hook moved with it: [`Toolbar`](../../../src/components/Toolbar.tsx), [`PopupBase`](../../../src/components/PopupBase.tsx) and the [`Notification`](../../../src/components/Notification.tsx) toasts built on it, [`ErrorMessage`](../../../src/components/ErrorMessage.tsx), [`HamburgerMenu`](../../../src/components/HamburgerMenu.tsx), and [`TutorialScrollUpButton`](../../../src/components/Tutorial/TutorialScrollUpButton.tsx).

## What Didn't Work

**Attributing it to an existing layout issue and deferring the fix.** The shift was first read as an exacerbation of #3555 rather than as a regression, and proposed as a separate PR; the question sat for weeks until testing under #3758 confirmed the fallback was the cause. It was a regression, introduced by #3653 itself.

**Reading the new handler code for the cause.** The refactor that introduced the bug is also what hid it: the evidence was not in the code that had been added but in the call site that had been deleted. Before #3653, `initEvents`'s `onSelectionChange` called `updateSafariKeyboardState()` under `isTouch && isSafari() && !isIOS`, and that updater was the only writer of `safariKeyboardStore` — so on every other platform the store sat at its defaults and the keyboard was permanently "closed". The gate lived in *who called the updater*, and nothing in the consumer recorded that it depended on it:

> I wonder if in the refactoring and generalization of `safariKeyboardStore` to `virtualKeyboardStore` we missed the fact that it was never supposed to track the height or open state in any other platform besides Mobile Safari, and that enabling it on other platforms would inadvertently turn on the `position: absolute` fallback where we don't want it. — @raineorshine, #3653

**Pure-React alternatives.** `react-bottom-fixed`, raised in #3596 as an off-the-shelf component that tracks keyboard open/close but not scrolling, was evaluated and rejected: performance was inadequate on iOS.

**Re-measuring the element on every scroll tick.** An early `PopupBase` revision called `getBoundingClientRect()` inside the unthrottled `scrollTop` handler, forcing layout on every tick of the scroll. Removed as unnecessary.

## Solution

The trigger gained its gate in a184a10960, the same PR that generalized the store: `virtualKeyboard.open` alone no longer selects the emulation, `virtualKeyboard.open && isSafari() && !isCapacitor()` does. The platform gate moved out of the updater's caller and into the consumer that depends on it, where it is visible to anyone reading the hook. `!isIOS` in the old call site and `!isCapacitor()` in the new one exclude the same build; the difference is that one of them is where the dependency is.

## Why This Works

Both halves of the gate exclude a different platform, and a third guard that is not on this line excludes desktop:

| Platform | `isSafari()` | `isCapacitor()` | `virtualKeyboard.open` | `position` |
| --- | --- | --- | --- | --- |
| Mobile Safari | true | false | true with the keyboard up | `absolute` — the workaround |
| iOS Capacitor | true | true | true with the keyboard up | `fixed` — `!isCapacitor()` excludes it |
| Android (Capacitor or web) | false | true / false | never written | `fixed` — `isSafari()` excludes it |
| Desktop Safari | true | false | never true | `fixed` — `iOSSafariHandler.init` returns early unless `isTouch` |

Desktop Safari is the row worth noticing: it satisfies both halves of the gate and is kept out only by `iOSSafariHandler`'s own `if (!isTouch || !isSafari()) return`. The same class of implicit, off-site guard that caused the original bug still stands behind that row.

## Prevention

- **Write the test that does not exist.** `src/hooks/__tests__/` has no `usePositionFixed` test. The mock shape is already in the tree — `vi.mock('../../browser', …)` spreading `importOriginal` and overriding `isCapacitor: () => true`, as in [`ModalSettings.native.ts`](../../../src/components/__tests__/ModalSettings.native.ts) — so a test that sets `isSafari: () => true` and `isCapacitor: () => true`, pushes `virtualKeyboardStore.update({ open: true })`, and asserts `position === 'fixed'` pins the exact regression. A second case with `isCapacitor: () => false` asserting `'absolute'` pins the workaround itself.
- **Before adding a reader of `virtualKeyboardStore`, run `grep -rn virtualKeyboardStore src` and copy a gate, not the bare `open`.** Two readers exist and each carries its own platform condition; a third that reads `open` unqualified is the same bug in a new place.
- **Reproduce keyboard-positioning reports on the Capacitor build, not in Mobile Safari.** The failure mode here is Capacitor-only by construction, so a Safari check passes and reads as a clean result. The [README](../../../README.md) has the Capacitor instructions.
- **Never simplify a platform predicate to its equivalent on the platform you are testing on.** `isSafari() && !isCapacitor()` is not `isSafari()`, and the difference is invisible in every browser.

## Related

- #3596, #3653, #3758, #3555
- [Mobile](../../cursor-and-caret.md#mobile) — the per-platform virtual-keyboard handler family, and why each platform needs its own signal.
- [`asyncFocus.ts`](../../cursor-and-caret.md#asyncfocusts) — the sibling Mobile Safari restriction, on programmatic focus rather than positioning.
- [`useNavAndFooterHeight` and `spaceBelow`](../../layout-rendering.md#usenavandfooterheight-and-spacebelow) and [Scrolling the cursor into view](../../layout-rendering.md#scrolling-the-cursor-into-view) — the other places the keyboard's height reaches layout.
