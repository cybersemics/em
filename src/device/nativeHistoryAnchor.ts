import { isSafari, isTouch } from '../browser'
import * as selection from './selection'

/** The hidden editing host, created on first use. */
let anchor: HTMLDivElement | null = null

/**
 * Focuses a hidden contenteditable so that WebKit has an editing host to register a native history step on, and
 * returns whether it took focus.
 *
 * WebKit dispatches the `historyUndo`/`historyRedo` `beforeinput` that carries an iOS native undo/redo gesture only
 * to a focused editing host, and only while its own stack has a step in that direction. The editing hosts in em are
 * the thoughts themselves, so undoing the creation of the only thought leaves none: the gesture is then delivered
 * nowhere and iOS confirms a redo that restores nothing (#5575). This host always exists, so the route survives an
 * empty thoughtspace.
 *
 * It is never focused while a thought is, so it cannot take the caret from one. The zero-width space gives
 * execCommand a text node to insert into, `inputmode=none` keeps the software keyboard shut, and `pointer-events:
 * none` keeps it out of reach of taps.
 */
const focusNativeHistoryAnchor = (): boolean => {
  if (!isTouch || !isSafari()) return false

  if (!anchor) {
    anchor = document.createElement('div')
    anchor.contentEditable = 'true'
    anchor.setAttribute('data-native-history-anchor', '')
    anchor.setAttribute('inputmode', 'none')
    anchor.style.cssText =
      'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;overflow:hidden;pointer-events:none'
    anchor.textContent = '\u200b'
    document.body.appendChild(anchor)
  }

  anchor.focus({ preventScroll: true })
  selection.selectNode(anchor)
  selection.collapse()

  return document.activeElement === anchor
}

export default focusNativeHistoryAnchor
