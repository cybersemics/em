import { store } from '../store.js'
import globals from '../globals.js'

// util
import { editableNode } from './editableNode.js'
import { encodeItems } from './encodeItems.js'
import { isRoot } from './isRoot.js'
import { sigRank } from './sigRank.js'
import { unrank } from './unrank.js'

/** Restores the selection to a given editable item and then dispatches setCursor. */
// from the element's event handler. Opt-in for performance.
// asyncFocus.enable() must be manually called before when trying to focus the selection on mobile
// (manual call since restoreSelection is often called asynchronously itself, which is too late for asyncFocus.enable() to work)
export const restoreSelection = (itemsRanked, { offset, cursorHistoryClear, done } = {}) => {

  // no selection
  if (!itemsRanked || isRoot(itemsRanked)) return

  const items = unrank(itemsRanked)

  // only re-apply the selection the first time
  if (!globals.disableOnFocus) {

    globals.disableOnFocus = true

    // use current focusOffset if not provided as a parameter
    const focusOffset = offset != null
      ? offset
      : window.getSelection().focusOffset

    store.dispatch({ type: 'setCursor', itemsRanked, cursorHistoryClear })

    // re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        globals.disableOnFocus = false
        if (done) done()
      }, 0)

      // re-apply the selection
      const el = editableNode(itemsRanked)
      if (!el) {
        console.error(`restoreSelection: Could not find DOM node for ${JSON.stringify(items)}"`)
        console.error(encodeItems(unrank(itemsRanked), sigRank(itemsRanked)), itemsRanked)
        // throw new Error(`Could not find element: "editable-${encodeItems(items)}"`)
        return
      }
      if (el.childNodes.length === 0) {
        el.appendChild(document.createTextNode(''))
      }
      const textNode = el.childNodes[0]
      const range = document.createRange()
      const sel = window.getSelection()
      range.setStart(textNode, Math.min(focusOffset, textNode.textContent.length))
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)

    }, 0)
  }
}
