---
title: Never consolidate Editable's tap handlers onto mousedown
date: 2026-09-17
category: editing
module: editable
problem_type: architecture_pattern
component: frontend
severity: high
applies_when:
  - Moving caret, focus, or cursor logic between event handlers in useEditMode or Editable
  - Adding another preventDefault branch to onMouseDown because the others are already there
  - Forwarding touch events through a component that patches preventDefault
  - Debugging a caret that never appears although the keyboard is up and the editable is focused
tags: [ios-safari, caret, touchend, mousedown, edit-mode, preventdefault, double-tap]
---

# Never consolidate Editable's tap handlers onto mousedown

## Context

A tap on a thought does two unrelated jobs, and on iOS Safari each one only works on its own event. [`useEditMode`](../../../src/components/Editable/useEditMode.ts)'s `onMouseDown` places the caret at the tapped coordinates. [`Editable`](../../../src/components/Editable.tsx)'s `handleTapBehavior`, registered on `touchend` (`{ passive: false }`) and `click` and on no mouse event at all, suppresses the first tap so that it moves the cursor without opening the keyboard — see [Mobile](../../cursor-and-caret.md#mobile) for how that suppression works and what `globals.suppressCursorAfterTouch` covers.

`onMouseDown` has since grown four early returns before it reaches caret placement — `isCommandKey`, the ongoing-press `pressingRef` guard, the retargeted-ghost guard using [`lastTouch`](../../../src/components/Editable/lastTouch.ts), and `globals.suppressCursorAfterTouch` — three of which `preventDefault` first, plus the `inVoidArea` and else-branch `preventDefault`s that close the handler. It now reads as *the* place where iOS tap problems are solved, which makes it the obvious home for one more. Both halves of this file record a move that was actually made, in both directions, and each one shipped a bug.

## Guidance

**Coordinate-based caret placement stays on `mousedown`.** `onMouseDown` calls [`getCaretOffset`](../../../src/device/getCaretOffset.ts) with the event's `clientX`/`clientY`, then `preventAutoscroll`, then `allowDefaultSelection()` paired with `setCaretOffset`; cleanup is `onFocus`, a `queueMicrotask(() => preventAutoscrollEnd(editable))`, registered under the same `isTouch && isSafari()` guard as the touch listeners. The pairing rule is stated in the comment beside the call, and the effect it re-arms in [`useEditMode`](../../cursor-and-caret.md#useeditmode); the pair must hold until `selection.set` moves into that declarative effect (#4179). There is one exception under that same guard: an `onTouchEnd` fallback for the rapid-tap case where WebKit retargets the synthesized `mousedown`/`focus` to the previously-focused thought. `touchend` is the only event iOS reliably delivers to the tapped thought, and that handler dispatches `setCursor` *without* `selection.set`, because a synchronous `selection.set` during `touchend` wakes iOS's text-selection machinery and swallows the tap that follows.

**Tap suppression stays on `touchend`.** Preventing the first `mousedown` of a double tap on iOS Safari destroys the second tap's native caret placement: the keyboard rises, `document.activeElement` is still the editable and `document.body.contains(el)` is still true, but `window.getSelection().focusNode` is `null` and typing does nothing. Preventing the first `touchend` suppresses the same synthesized `focus`/`click` and leaves WebKit's double-tap caret placement — including the character offset under the finger — intact. Native offset placement is not negotiable, so there is no fallback if this is lost.

Neither may move. The three obvious alternatives to `mousedown` all fail for reasons a reader of the handler cannot see:

| Event | Why it cannot own caret placement |
| --- | --- |
| `mouseup` | The tap's own `focus` handler dispatches `setCursor`, which re-runs [`expandThoughts`](../../../src/selectors/expandThoughts.ts) and relinearizes the tree, so `mouseup` is delivered on a different thought than the one under the finger. |
| `focus` | Carries no coordinates, and does not fire at all when tapping inside the thought that already holds the cursor. |
| `click` | Runs after `focus` — too late to place the caret without flicker — and inherits `mouseup`'s retargeting. |

## Why This Matters

In #4298 a tap on `World` produced a `mouseup` on `G`, the last thought of the subtree that the tap's own focus had just expanded. That alone would be a no-op; what made it catastrophic is [`preventAutoscroll`](../../../src/device/preventAutoscroll.ts)'s module-level singleton. `preventAutoscrollEnd` clears `timeoutId` and nulls `activeEl` *before* its `if (!el) return`, so the wrong-element call both failed to restore `World` and cancelled the 10 ms `PREVENT_AUTOSCROLL_TIMEOUT` fallback that would have. `World` kept its inflated `paddingBottom` and `translate` forever and covered every thought above it. The comment at `preventAutoscroll`'s own re-entrancy guard names the case where a second call overwrites the saved styles, not this one. The singleton has since acquired two more readers — `isPreventAutoscrollInProgress` in [`scrollCursorIntoView`](../../../src/device/scrollCursorIntoView.ts) and `getAutoscrollPadding` in [`VirtualThought`](../../../src/components/VirtualThought.tsx) — so a wrong-element call now also corrupts height measurement and the scroll retry. See [`preventAutoscroll.ts`](../../cursor-and-caret.md#preventautoscrollts) for what it does.

The `touchend` direction is expensive for a different reason: it cannot be re-derived from inside the app. Every in-app observable — `document.activeElement`, node identity, `document.body.contains`, `editableNonce`, `allowInnerHTMLChange`, dispatch order, render count — is identical between a double tap and two slow single taps. Isolating the asymmetry took a bare `contenteditable` page outside **em**, after roughly eight hours spent inside it. The ~350–400 ms threshold below which the bug appears is WebKit's own double-tap window, not an app timeout: every timeout in the codebase was reduced to 1 ms with no effect, so grepping for a matching constant is wasted effort.

Three things that look like they would warn the next person, and do not:

- **The JSDoc on `onMouseDown` asserts the opposite of the code below it** — it still says the caret position is computed "so that it can be set on mouseup", the only mention of `mouseup` left anywhere in `src/components/Editable/`. A reader who trusts it will conclude the split already exists and that restoring it is harmless.
- **`git blame` no longer reaches the decision.** The `touchend` and `click` registrations blame to the #3949 manual-listener refactor, not to #2948, whose title says what it did. The history does not answer this question any more.
- **There is no automated guardrail.** An iOS BrowserStack test was attempted in #4403 and could never be made to fail on `main`, so nothing but this file stands between the next consolidation and #4298.

One hazard lives outside `Editable` entirely. [`TraceGesture`](../../../src/components/TraceGesture.tsx) forwards touch events to `signaturePad` and monkeypatches `e.preventDefault` to a noop; its `onTouchStart` sets the noop permanently, while `onTouchEnd` saves and restores the original around the forward. That asymmetry is the fix: the blanket noop silently neutralizes `Editable`'s `touchend` suppression, and `onTouchEnd` is the only place it is put back.

## When to Apply

Before editing any handler in `useEditMode` or `Editable`:

- **Adding a `preventDefault` to `onMouseDown`?** Only if the tap it suppresses is one `touchend` never sees. The existing else-branch comment names that case — the thought's outer edge and extended tap area deliver `mousedown` and `focus` but no `touchend` — and links the reproduction in #2948. It is the only sanctioned reason; it does not say that the reverse move is fatal.
- **Moving `getCaretOffset` off `mousedown`?** The change is not one branch but six: the four early returns and the `inVoidArea` and else-branch `preventDefault`s are all calibrated to `mousedown`'s timing, including WebKit withholding the synthesized `mousedown` for more than 500 ms while a press continues, which is what keeps `pressingRef` true for a long press and false for a quick tap.
- **Touching `preventAutoscrollEnd`'s call site?** It must run on the element that `preventAutoscroll` was called on, in a handler guaranteed to fire on that element. `focus` is that handler. Any delay tuned against the 10 ms fallback is a race, not a fix.
- **Adding a component that forwards or patches touch events?** Check that it restores `preventDefault` on `touchend`, as `TraceGesture` does.

## Examples

Approaches that were tried on the two incidents and failed, each for a reason that is not visible in the final diff:

| Tried | What happened |
| --- | --- |
| `requestAnimationFrame` instead of `queueMicrotask` in the `mouseup` cleanup | Worked, but only by winning a race against the 10 ms fallback. |
| Gating the `mouseup` cleanup on `offsetRef.current !== null` | Skipped `preventAutoscrollEnd` entirely and fell through to the fallback, producing a visible blink. |
| Short-circuiting `setCaretOffset` while a non-collapsed selection is active | Rejected: a tap outside the selection still needs coordinate hit detection. |
| Putting `setCaretOffset` in `onMouseUp` at all (#3410) | Created #4298. It was moved there to keep it from firing early during a long press, a job `pressingRef` now does on `mousedown`. |
| Restoring focus from a `useEffect` when `focusNode` was null | `focus()` alone did nothing; `blur()` then `focus()` showed the caret at offset 0, losing the tap offset. |
| Fully memoizing `ContentEditable`, on the theory that a re-render was clearing the selection | No effect. The component re-renders once per tap either way. |

## Related

- #4298, #4371, #3410 — caret placement on `mousedown`.
- #2837, #2948, #4872 — tap suppression on `touchend`.
- [Cursor and Caret → Mobile](../../cursor-and-caret.md#mobile) — the two-tap pattern, `handleTapBehavior`'s dual registration, and `TAP_CLICK_TIMEOUT`.
- [Cursor and Caret → `useEditMode`](../../cursor-and-caret.md#useeditmode) — the declarative `shouldSetSelection` conditions and `allowDefaultSelection`.
- [Cursor and Caret → `preventAutoscroll.ts`](../../cursor-and-caret.md#preventautoscrollts) — the styles, the 10 ms restore, and `getAutoscrollPadding`.
- [Nothing can fail when void-area caret placement breaks](./void-area-caret-has-no-test.md) — the `inVoidArea` branch this handler ends in, and why no runner observes it.
- [Cursor and Caret → Caret restoration on iOS](../../cursor-and-caret.md#caret-restoration-on-ios) — the other place a cursor change relinearizing the tree moves the target out from under an input.
