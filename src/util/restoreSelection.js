import { store } from '../store.js'
import globals from '../globals.js'

// util
import {
  editableNode,
  hashContext,
  headRank,
  headValue,
  isDivider,
  isRoot,
  pathToContext,
  setSelection,
} from '../util.js'

/** Restores the selection to a given editable thought and then dispatches setCursor. */
// from the element's event handler. Opt-in for performance.
// asyncFocus.enable() must be manually called before when trying to focus the selection on mobile
// (manual call since restoreSelection is often called asynchronously itself, which is too late for asyncFocus to work)
export const restoreSelection = (thoughtsRanked, { offset, cursorHistoryClear, done } = {}) => {

  // no selection
  if (!thoughtsRanked || isRoot(thoughtsRanked) || isDivider(headValue(thoughtsRanked))) return

  const thoughts = pathToContext(thoughtsRanked)

  // only re-apply the selection the first time
  if (!globals.disableOnFocus) {

    globals.disableOnFocus = true

    // use current focusOffset if not provided as a parameter
    const focusOffset = offset != null
      ? offset
      : window.getSelection().focusOffset

    store.dispatch({ type: 'setCursor', thoughtsRanked, cursorHistoryClear })

    // re-apply selection
    setTimeout(() => {

      // wait until this "artificial" focus event fires before re-enabling onFocus
      setTimeout(() => {
        globals.disableOnFocus = false
        if (done) done()
      }, 0)

      // re-apply the selection
      const el = editableNode(thoughtsRanked)
      if (!el) {
        console.error(`restoreSelection: Could not find DOM node for ${JSON.stringify(thoughts)}"`)
        console.error(hashContext(thoughtsRanked, headRank(thoughtsRanked)), thoughtsRanked)
        // throw new Error(`Could not find element: "editable-${hashContext(thoughts)}"`)
        return
      }
      setSelection(el, { offset: focusOffset })
    }, 0)
  }
}
