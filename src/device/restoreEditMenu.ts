import { WebviewBackground } from 'webview-background'
import { isIOS, isSafari, isTouch } from '../browser'
import selectionMenuStore from '../stores/selectionMenuStore'
import * as selection from './selection'

/** Returns true if two lists of rects have the same position and size, in the same order. */
const isSameRects = (a: DOMRect[], b: DOMRect[]): boolean =>
  a.length === b.length &&
  a.every(
    (rect, i) =>
      rect.left === b[i].left && rect.top === b[i].top && rect.width === b[i].width && rect.height === b[i].height,
  )

/**
 * Brings back the edit menu (Cut, Copy, Paste) after an edit of em's own has changed the selected text, on iOS.
 * WebKit dismisses the menu whenever the rendered rects of the selection change, so an edit that keeps the text
 * selected but moves or resizes it, such as a letter case change, leaves the selection without its menu, and
 * nothing in the web layer can present it again (#5641). An edit that leaves the rects untouched, such as a text
 * color, keeps the menu, so nothing is done then.
 *
 * In the iOS app, the native plugin asks WebKit to present its own menu again. Mobile Safari has no native layer,
 * so em shows its own menu instead (SelectionMenu). Android keeps its menu as long as the selected text is changed
 * in place, and desktop browsers have no such menu, so this does nothing there.
 *
 * @param rectsBefore The selection's rects from selection.editableClientRects() before the edit.
 */
const restoreEditMenu = (rectsBefore: DOMRect[]): void => {
  if (!isTouch || !isSafari()) return

  const rectsAfter = selection.editableClientRects()
  if (rectsAfter.length === 0 || isSameRects(rectsBefore, rectsAfter)) return

  if (isIOS) {
    WebviewBackground.presentEditMenu()
  } else {
    selectionMenuStore.update(true)
  }
}

export default restoreEditMenu
