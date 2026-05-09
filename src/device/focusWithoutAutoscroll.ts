import { isTouch } from '../browser'
import { getAutoscrollTechnique } from '../util/autoscrollTechnique'
import { debugLog, editableLabel, selectionSnapshot } from '../util/debugAutoscrollLog'

/**
 * v2 technique for issue #3765.
 *
 * Blocks the browser's native focus + autoscroll path entirely, so iOS WebKit
 * never runs its autoscroll and `position: fixed` elements (toolbar) never
 * jump. Must be invoked from a `mousedown` handler — `preventDefault` on
 * mousedown is what suppresses native focus.
 *
 * The caller is then responsible for placing the caret (e.g. via
 * `getCaretOffset` + `selection.set`) and for scrolling the editor with
 * `scrollCursorIntoView`.
 *
 * Returns true if focus was taken over, false if the call was a no-op (caller
 * should fall back to default behavior).
 */
const focusWithoutAutoscroll = (el: HTMLElement | null | undefined, e: MouseEvent | TouchEvent): boolean => {
  if (!isTouch || !el) return false

  // Order matters on iOS WebKit:
  //
  // 1) Focus first, while the user-activation gesture from the tap is still valid.
  //    `preventScroll: true` (iOS Safari 15.5+) suppresses the autoscroll that normally accompanies
  //    focus changes, which is what causes `position: fixed` elements to jump (issue #3765).
  //    Calling focus() before preventDefault preserves caret-rendering: when preventDefault runs
  //    first, iOS sometimes registers the activeElement change but does NOT paint a caret until
  //    another user gesture arrives, so the caller's manual selection.set is invisible.
  //
  // 2) Then preventDefault to suppress the native caret-from-tap that would otherwise overwrite
  //    the caller's manual caret placement after this function returns.
  const v2Logging = getAutoscrollTechnique() === 'v2'
  const wasFocused = el === document.activeElement

  if (!wasFocused) {
    if (v2Logging) {
      debugLog('focus.before', `target=${editableLabel(el)} active=${editableLabel(document.activeElement)}`)
    }
    el.focus({ preventScroll: true })
    if (v2Logging) {
      debugLog('focus.after', `active=${editableLabel(document.activeElement)} ${selectionSnapshot()}`)
    }
  } else if (v2Logging) {
    debugLog('focus.skip', `target=${editableLabel(el)} (already active)`)
  }
  e.preventDefault()

  return true
}

export default focusWithoutAutoscroll
