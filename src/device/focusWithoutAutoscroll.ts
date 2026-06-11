import { isSafari, isTouch } from '../browser'
import asyncFocus from './asyncFocus'
import * as selection from './selection'

/**
 * Focus an editable and place the caret without triggering iOS native autoscroll.
 *
 * This function is called from `useEditMode` (mousedown + cursor-change useEffect) and `Note` (mousedown +
 * note-focus useEffect). Mousedown calls it synchronously within the user gesture so iOS accepts
 * the focus and same-thought re-taps can reposition the caret. The useEffect call handles
 * programmatic cursor changes (Return, arrow keys, gestures, sidebar restore, toggleNote).
 * Idempotent — safe to call repeatedly with the same element + offset.
 *
 * We do this using two strategies:
 * 
 * (1) `focus({ preventScroll: true })` blocks the focus-driven autoscroll. This differs from prior strategies,
 * which compensated for iOS autoscroll or attempted to disarm it with CSS tricks, rather than preventing it from firing
 * in the first place.
 *
 * (2) Save and restore `window.scrollY` around `selection.set` to suppress the selection-driven autoscroll the
 * browser fires when adding a Range inside a contentEditable.
 *
 * Keeping the cursor visible after the keyboard opens is handled separately by
 * `useScrollCursorIntoView` in `BulletCursorOverlay` — this function intentionally does NOT scroll.
 */

/** Focus an editable and place the caret without triggering iOS native autoscroll. */
const focusWithoutAutoscroll = (el: HTMLElement | null | undefined, { offset }: { offset: number }): void => {
  if (!el) return

  const wasFocused = el === document.activeElement
  const currentOffset = wasFocused ? selection.offsetThought() : null

  // Idempotency guard — already focused at this offset, nothing to do.
  if (wasFocused && currentOffset === offset) return

  // iOS Safari silently ignores programmatic selection (and any focus that would open the
  // keyboard) unless one of two conditions holds: the call is within "transient user activation"
  // (the short window following a real tap), or an editable element already holds focus. This is
  // WebKit's anti-abuse policy — without it, pages could pop the keyboard or move the selection
  // at any time without the user's involvement.
  //
  // asyncFocus converts the first condition into the second: while activation is still in effect
  // it focuses a hidden input, putting the page into an active editing session that persists
  // after the activation window closes, so a later asynchronous selection.set (e.g. from a
  // post-render useEffect) is honored rather than dropped. If the selection is already on a
  // thought, an editing session already exists and no priming is needed. See asyncFocus.ts.
  if (isTouch && isSafari() && !selection.isThought()) {
    asyncFocus()
  }

  if (!wasFocused) {
    el.focus({ preventScroll: true })
  }

  // Suppress selection-driven autoscroll: setting a Range inside a contentEditable makes the
  // browser scroll the caret into view, independently of focus. Capture and revert any scrollY
  // shift synchronously. `useScrollCursorIntoView` handles bringing the cursor into view once
  // layout settles — we must not scroll here, otherwise the two sources interrupt each other on
  // rapid cursor changes (spam-Enter) and the page jumps to a mid-screen position.
  const yBefore = window.scrollY
  selection.set(el, { offset })
  if (window.scrollY !== yBefore) {
    window.scrollTo(window.scrollX, yBefore)
  }
}

export default focusWithoutAutoscroll
