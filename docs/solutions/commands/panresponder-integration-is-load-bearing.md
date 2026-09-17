---
title: MultiGesture's react-native-web integration cannot be inlined or defaulted
date: 2026-09-17
category: commands
module: gestures
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - Changing, tidying, or removing a handler in MultiGesture's PanResponder config
  - Reviving the standing request to vendor PanResponder and drop react-native-web
  - The Gesture Menu or its blur stays on screen after the finger lifts
  - A gesture activates from a touch that began in the scroll zone or on a selection handle
  - Adding a handler that treats responder termination as the end of a touch
tags: [gestures, multigesture, react-native-web, panresponder, ios, refactor, stacking-context]
---

# MultiGesture's react-native-web integration cannot be inlined or defaulted

## Context

[`MultiGesture`](../../../src/components/MultiGesture.tsx) wraps the whole app on touch devices: `MultiGestureIfTouch` in [`AppComponent`](../../../src/components/AppComponent.tsx) (:101-116) mounts it whenever `isTouch`, handing it `handleGestureSegment`, `handleGestureEnd`, `shouldCancelGesture` and `handleGestureCancel` from [`commands.ts`](../../../src/commands.ts). What a gesture *is* and what those handlers do with one is [Commands → Gesture activation](../../commands.md#gesture-activation) and [Glossary → gesture](../../glossary.md#g).

Its `PanResponder` comes from `react-native`, which [`vite.config.ts`](../../../vite.config.ts) (:69) aliases to `react-native-web`. Five symbols, three importers, one alias, two `package.json` entries — a surface small enough to read as a chore, and costed as one twice. What it actually buys is two behaviours nobody wrote down: an arbitration lifecycle in which **termination is not the end of a touch**, and a `<View>` whose stacking context every gesture surface is calibrated against.

## Guidance

### One line refuses termination, and nothing tests it

react-native-web's `ResponderSystem` treats a `scroll` event on any ancestor of the responder node as a termination event, and lets the responder refuse termination for only three event types — `scroll`, `contextmenu` and `selectionchange`. Under iOS momentum scrolling that scroll event fires every frame, so terminate and grant cycle continuously, the responder can be in a terminated state at `touchend`, and a release is dispatched only to the *current* responder — `onPanResponderRelease` never runs.

`onPanResponderTerminationRequest: () => !this.disableScroll`, the last entry in MultiGesture's `PanResponder.create` config (:371), is what prevents it. It carries no comment, no test names it, and `git log -S'() => !this.disableScroll'` returns exactly one commit — e43044acb2 (#4038), which changed it from `() => true`. Putting `() => true` back hands the stuck Gesture Menu back with it, and nothing in the suite would notice: no test names the handler, and none reproduces the momentum scrolling that triggers it.

What strands is [`commands.ts`](../../../src/commands.ts)'s `gestureMenuTimeout`: armed in `handleGestureSegment` on a `COMMAND_PALETTE_TIMEOUT` delay (:625), cleared in three places — the next segment (:624), `handleGestureEnd` (:718), and `handleGestureCancel` (:757), which is MultiGesture's `onCancel` prop. The menu and its full-viewport blur therefore stick only when **neither a release nor a cancel reaches MultiGesture**. The document-level `pointerup` and `pointercancel` listeners (:209-245) are what turn a lost release into a cancel; the comment above them covers the pinned-touch-target case they were written for, and the `if (this.currentStart) return` guard in the body `touchstart` listener (:149-153) covers the stray-second-finger one. Read those two comments rather than a retelling.

The asymmetry is the durable part: **refuse termination, but never treat a termination that does happen as a release or a cancel.** The refusal only covers three event types, so a `touchcancel` or a window blur terminates regardless. An `onPanResponderTerminate` handler that calls `onCancel` and `reset()` is the obvious missing safety net, and it is missing on purpose.

### Two fixes were deleted from #4038 and must not return in that form

c0d6418591 (#4711) removed `onPanResponderTerminate` from MultiGesture and `pointerEvents: 'none'` from `EmptyThoughtspace`, and authored the `pointerup` fallback and its comment block in their place. Neither deletion was a simplification; see [Examples](#examples) for what each one did. The invariant both encode: a terminated responder leaves `abandon`, `disableScroll` and `touchTarget` intact, and MultiGesture does not ask any other component to opt out of hit testing on its behalf.

The guards that hold this are `does not activate a gesture that starts in the scroll zone` and `releases a gesture whose touch target unmounts mid-gesture` in [`src/e2e/puppeteer/__tests__/gestures.ts`](../../../src/e2e/puppeteer/__tests__/gestures.ts), plus `keeps native text selection active without opening the gesture menu when dragging an end handle` in [`src/e2e/iOS/__tests__/gestures.ts`](../../../src/e2e/iOS/__tests__/gestures.ts). Run all three before touching the PanResponder config.

### Vendoring PanResponder is not a pure refactor

It has been merged and reverted twice: f954fce7c6 (#3608) reverted by 5a0ee3c1cd, and 2bb052d2cf (#3756) reverted by 0f77a946b9 for #3882. Both closed the standing request #2973, which is open again.

What breaks is never PanResponder's own arithmetic — that is copied verbatim from Meta — but the host `ResponderView` that replaces React's event plumbing. A third attempt's acceptance criteria are behavioural, not structural:

- **Leave scroll control to the body listener.** `this.disableScroll` is read in two places: the `{ passive: false }` `touchmove` listener on `document.body` (:131-144), the only thing that suppresses a scroll, and `onPanResponderTerminationRequest`. A ResponderView that calls `preventDefault()` on `touchmove` itself kills the scroll zone outright — #3608 shipped that and then fixed it by handing the decision back. The comment above the body listener records that `overflow: hidden` and the other scroll-disabling approaches were tried and had side effects.
- **Keep `touchstart`'s `preventDefault`.** #3608 settled on calling it once the responder is granted, while leaving `touchmove` alone; dropping it is not what fixes scrolling.
- **Do not recreate `<View>`'s stacking context without its override.** `View` emits `position: relative; z-index: 0`; MultiGesture dissolves that with `style={{ zIndex: 'auto' }}` (:394-402) so that the blur and the trace can be ordered against a NavBar mounted outside the gesture tree. The comments there, and the painting-order comments in [`GestureContentBlur`](../../../src/components/GestureMenu/GestureContentBlur.tsx) (:9-18, :41-44), are calibrated against the dissolved context. A reimplementation that reproduces the `z-index: 0` context but ignores the override re-traps the blur and the trace below NavBar, silently — see [compositing traps](../styling/compositing-traps-blur-blend-stacking.md).
- **Verify after deploy, not before.** Both reverts followed approvals that came after gestures were confirmed on real devices.

The full removal surface, for anyone costing it:

| File | Removed |
| --- | --- |
| [`MultiGesture.tsx`](../../../src/components/MultiGesture.tsx) | `GestureResponderEvent`, `PanResponder`, `PanResponderInstance`, `View`, `ViewStyle` |
| [`commands.ts`](../../../src/commands.ts) | `GestureResponderEvent` |
| [`@types/Command.ts`](../../../src/@types/Command.ts) | `GestureResponderEvent` |
| [`vite.config.ts`](../../../vite.config.ts) | the `react-native` → `react-native-web` alias |
| [`package.json`](../../../package.json) | `react-native-web` and `@types/react-native` |

## Why This Matters

The two halves name each other's work. A vendored `ResponderSystem` has to reimplement the termination request the surviving line depends on; anyone tidying an unexplained one-liner out of the PanResponder config deletes the thing a vendored system would have to be measured against. Neither reads as load-bearing at the point of edit.

The failure modes are not equally expensive. `onPanResponderTerminate` shipped with a comment stating that without it the gesture menu stays stuck — reasoning that sounds right and was wrong — and the #4536 Puppeteer test now catches it, so retrying it costs a cycle rather than a shipped bug. The termination *request* is caught by nothing, so changing it ships.

Both vendoring attempts were approved on device and broke only on deployed staging: "Maybe there is an additional dependency we're not seeing like device/platform/build" (raineorshine, #3608). A reviewer confirming gestures on a phone is not the acceptance bar — MultiGesture writes `touchstart`, `swipe`, `gesture`, `gestureCancel` and `touchend` entries to the [debug log](../../debug-log.md), and a third attempt's regressions are legible there from a device nobody can reproduce on.

## When to Apply

- Before editing any handler in `PanResponder.create`, including deleting one that has no comment.
- When the Gesture Menu, its blur, or a transparent overlay survives the finger lifting — start from which of release or cancel failed to arrive, not from the menu.
- When a gesture activates from a touch that began outside the gesture zone: something reset `abandon` mid-touch.
- When #2973 comes back around, or a dependency audit flags `react-native-web` as five imports' worth of weight.
- Not for the pinned-touch-target mechanism or the stray-second-finger guard. Both are written out beside the code in [`MultiGesture.tsx`](../../../src/components/MultiGesture.tsx), and [react-dnd patches](../../drag-and-drop.md#react-dnd-patches) records the same pinned-target problem solved the same way in the touch backend.

## Examples

The two fixes #4038 shipped and #4711 deleted:

| Deleted | Why it must not come back in that form |
| --- | --- |
| `onPanResponderTerminate: e => { onCancel(); this.reset() }` | `reset()` also clears `abandon`, so a touch that began in the scroll zone or on a native text-selection handle re-activated as a live gesture once the responder was terminated and re-granted — #4536 and #4521. A terminated responder must leave the abandoned state intact. |
| `pointerEvents: 'none'` on the `EmptyThoughtspace` root | It worked, by anchoring the touch to the stable `#content` ancestor. It also made gesture correctness depend on every transient component that might sit under a finger opting out of hit testing, with nothing to enforce it — and removing that one line reintroduced #3887 immediately. The invariant belongs inside MultiGesture. |

The two vendoring attempts, by phase:

| Attempt | What surfaced |
| --- | --- |
| #3608, during review | The trace drew its first dot and then stopped following the finger. Once that was fixed, the scroll zone stopped scrolling at all: the inlined `ResponderView` called `preventDefault()` on `touchmove` itself instead of letting the event reach MultiGesture's body listener. Both fixed inside the PR, gesture/trace/scroll re-confirmed on device, approved. |
| #3608, after merge | Gestures and the trace did not work at all in Mobile Safari on deployed staging, while tapping and scrolling did. Neither the author nor the tester reproduced it — retested green on an iPhone 12 Pro Max, iOS 18.6.2. Reverted; #2973 reopened. |
| #3756, during review | The trace moved in front of the Command Center, a behaviour change reached through edits to `TraceGesture` that a pure refactor should not have needed, and accepted on the record. Tracing alternated between working and not working depending on whether the app had been freshly installed or restarted, on iOS 18.6.2 and 26.2.1. The Capacitor app crashed on iOS 26. |
| #3756, after merge | Thoughts flashed gray on entering edit mode (#3882), bisected to 2bb052d2cf. Reverted wholesale. |

Neither revert commit says what went wrong: 5a0ee3c1cd gives no reason at all, 0f77a946b9 names only the issue the revert fixed. The non-determinism across fresh install and restart, and the Mobile Safari failure that only existed on staging, are still unaccounted for — which is why the criteria above are about what the ResponderView must do rather than about how faithfully it was copied.

## Related

- #4038, #3887, #4536, #4521, #4711, #3608, #3756, #3882, #2973, #4466
- [Commands → Gesture activation](../../commands.md#gesture-activation) — the gesture zone, `handleGestureSegment`, `handleGestureEnd`
- [Debug Log](../../debug-log.md) — MultiGesture is a source; its `gesture`, `gestureCancel`, `touchstart` and `touchend` entries are how a device-only regression is read
- [When a blur, a blend, or a z-index silently does nothing](../styling/compositing-traps-blur-blend-stacking.md) — the stacking context the gesture blur and trace are ordered in
- [react-dnd patches](../../drag-and-drop.md#react-dnd-patches) — the same pinned-touch-target problem, solved the same way in the touch backend
