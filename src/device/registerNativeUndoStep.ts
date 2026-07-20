import { isSafari, isTouch } from '../browser'
import * as selection from './selection'

/**
 * Registers a single native undo step in WKWebView for a formatSelection edit on iOS (Safari and the Capacitor app,
 * both WKWebView).
 *
 * The DOMParser-based formatSelection applies formatting by re-rendering the contentEditable from Redux (editThought),
 * not via document.execCommand, so WebKit records no native undo step. Without a step, a native undo gesture
 * (shake-to-undo / three-finger swipe) has nothing to undo and fires no event — so the historyUndo `beforeinput` handler
 * that routes native undo through em's own undo (#3954) never runs (#4637).
 *
 * This performs a scoped execCommand purely so WebKit registers one native undo step per format. Its DOM effect is
 * immaterial: it is immediately overwritten by the editThought re-render, and the native undo it anchors is
 * preventDefaulted by the beforeinput handler (which dispatches em's undo instead). It exists only as the trigger that
 * makes the native undo gesture fire.
 *
 * No-op on non-iOS platforms (isTouch && isSafari gates iOS WKWebView; desktop Safari has no shake/three-finger undo).
 */
const registerNativeUndoStep = (editable: HTMLElement, html: string, editMode: boolean): void => {
  if (!isTouch || !isSafari()) return

  const inputMode = editable.getAttribute('inputmode')

  if (!editMode) {
    editable.setAttribute('inputmode', 'none') // prevent keyboard from reopening on focus
    editable.focus({ preventScroll: true })
    selection.select(editable)
  }

  document.execCommand('insertHTML', false, html)

  if (!editMode) {
    selection.clear()
    editable.setAttribute('inputmode', inputMode ?? '')
  }
}

export default registerNativeUndoStep
