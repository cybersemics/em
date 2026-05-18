import { isSafari, isTouch } from '../browser'
import { getAutoscrollTechnique } from '../util/autoscrollTechnique'
import { debugLog, editableLabel } from '../util/debugAutoscrollLog'
import asyncFocus from './asyncFocus'
import * as selection from './selection'

/** V2 chokepoint for issue #3765. Focuses an editable, places the caret at the given offset, and suppresses the native autoscroll triggered by focus and selection placement. Called from useEditMode's mousedown (synchronously within the user gesture so iOS accepts the focus, and so same-thought re-taps reposition the caret — cursorOffset is not a useEffect dep) and from its cursor-change useEffect (for programmatic cursor changes such as Return-new-thought, arrow keys, gestures, and sidebar restore). Idempotent — safe to call from both back-to-back. Strategy: (1) focus({preventScroll: true}) blocks the focus-driven autoscroll; (2) save/restore window.scrollY around selection.set to suppress the selection-driven autoscroll the browser fires when adding a Range inside a contentEditable. Keeping the cursor visible after the keyboard opens is handled separately by useScrollCursorIntoView in BulletCursorOverlay — this function intentionally does NOT scroll. */
const focusWithoutAutoscroll = (el: HTMLElement | null | undefined, { offset }: { offset: number }): void => {
  if (!el || getAutoscrollTechnique() !== 'v2') return

  const wasFocused = el === document.activeElement
  const currentOffset = wasFocused ? selection.offsetThought() : null

  // Idempotency guard — already focused at this offset, nothing to do.
  if (wasFocused && currentOffset === offset) {
    debugLog('focusWithoutAutoscroll.noop', `el=${editableLabel(el)} offset=${offset}`)
    return
  }

  debugLog(
    'focusWithoutAutoscroll',
    `el=${editableLabel(el)} offset=${offset} wasFocused=${wasFocused} currentOffset=${currentOffset}`,
  )

  // iOS Safari rejects programmatic selection outside a user gesture unless an asyncFocus has
  // primed it. The condition mirrors useEditMode's v1 path.
  if (isTouch && isSafari() && !selection.isThought()) {
    asyncFocus()
  }

  if (!wasFocused) {
    el.focus({ preventScroll: true })
    debugLog('focus.after', `active=${editableLabel(document.activeElement)}`)
  }

  // Suppress selection-driven autoscroll: setting a Range inside a contentEditable makes the
  // browser scroll the caret into view, independently of focus. Capture and revert any scrollY
  // shift synchronously. The system-wide useScrollCursorIntoView in BulletCursorOverlay handles
  // bringing the cursor into view once layout settles — we must not scroll here, otherwise the
  // two sources interrupt each other on rapid cursor changes (spam-Enter) and the page jumps to
  // a mid-screen position.
  const yBefore = window.scrollY
  selection.set(el, { offset })
  if (window.scrollY !== yBefore) {
    const delta = window.scrollY - yBefore
    debugLog('selection.set.scrollSuppressed', `Δ=${delta.toFixed(0)}`)
    window.scrollTo(window.scrollX, yBefore)
  }
}

export default focusWithoutAutoscroll
