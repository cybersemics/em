import { isSafari, isTouch } from '../browser'
import asyncFocus from './asyncFocus'
import * as selection from './selection'

/**
 * Chokepoint for focusing an editable and placing the caret without triggering iOS native
 * autoscroll. Suppresses the autoscroll iOS WebKit fires when focus or selection moves — the
 * cause of `position: fixed` elements jumping in issue #3765.
 *
 * Called from `useEditMode` (mousedown + cursor-change useEffect) and `Note` (mousedown +
 * note-focus useEffect). Mousedown calls it synchronously within the user gesture so iOS accepts
 * the focus and same-thought re-taps can reposition the caret. The useEffect call handles
 * programmatic cursor changes (Return, arrow keys, gestures, sidebar restore, toggleNote).
 * Idempotent — safe to call repeatedly with the same element + offset.
 *
 * Strategy: (1) `focus({ preventScroll: true })` blocks the focus-driven autoscroll; (2) save and
 * restore `window.scrollY` around `selection.set` to suppress the selection-driven autoscroll the
 * browser fires when adding a Range inside a contentEditable.
 *
 * Keeping the cursor visible after the keyboard opens is handled separately by
 * `useScrollCursorIntoView` in `BulletCursorOverlay` — this function intentionally does NOT scroll.
 */
const focusWithoutAutoscroll = (el: HTMLElement | null | undefined, { offset }: { offset: number }): void => {
  if (!el) return

  const wasFocused = el === document.activeElement
  const currentOffset = wasFocused ? selection.offsetThought() : null

  // Idempotency guard — already focused at this offset, nothing to do.
  if (wasFocused && currentOffset === offset) return

  // iOS Safari rejects programmatic selection outside a user gesture unless an asyncFocus has
  // primed it.
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
