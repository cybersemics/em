import { WebviewBackground } from 'webview-background'
import { isIOS } from '../browser'
import * as selection from './selection'

/** Returns true if two lists of rects have the same position and size, in the same order. */
const isSameRects = (a: DOMRect[], b: DOMRect[]): boolean =>
  a.length === b.length &&
  a.every(
    (rect, i) =>
      rect.left === b[i].left && rect.top === b[i].top && rect.width === b[i].width && rect.height === b[i].height,
  )

/**
 * Brings back the native edit menu (Cut, Copy, Paste) in the iOS app after an edit of em's own has changed the
 * selected text. WebKit can dismiss the menu when the rendered rects of the selection change, so an edit that keeps
 * the text selected but moves or resizes it, such as a letter case change or a Bold, leaves the selection without its
 * menu, and nothing in the web layer can present it again (#5641). The native plugin asks WebKit to present its own
 * menu again, which does nothing visible if WebKit kept it up. An edit that leaves the rects untouched, such as a text
 * color, keeps the menu, so nothing is done then.
 *
 * Mobile Safari has no native layer, so its menu stays dismissed until the user's next tap on the selection. Android
 * keeps its menu as long as the edit keeps the selection (see editInPlace), and desktop browsers have no such menu.
 *
 * @param rectsBefore The selection's rects from selection.editableClientRects() before the edit.
 */
const restoreEditMenu = (rectsBefore: DOMRect[]): void => {
  if (!isIOS) return

  const rectsAfter = selection.editableClientRects()
  if (rectsAfter.length === 0 || isSameRects(rectsBefore, rectsAfter)) return

  WebviewBackground.presentEditMenu()
}

export default restoreEditMenu
