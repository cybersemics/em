import { store } from '../store.js'
import { isMobile } from '../browser.js'

// constants
import {
  AUTO_PROSE_VIEW_MIN_CHARS_DESKTOP,
  AUTO_PROSE_VIEW_MIN_CHARS_MOBILE,
} from '../constants.js'

// util
import {
  contextOf,
  getChildrenWithRank,
  hashContext,
  selectPrevEditable,
  pathToContext,
} from '../util.js'

export default {
  id: 'cursorUp',
  name: 'Cursor Up',
  keyboard: { key: 'ArrowUp' },
  hideFromInstructions: true,
  exec: e => {

    const { cursor, proseViews = {} } = store.getState()

    if (cursor) {

      const contextRanked = contextOf(cursor)
      const children = getChildrenWithRank(contextRanked)
      const isProseView = hashContext(pathToContext(contextRanked)) in proseViews
      const isAutoProseView = !isProseView && children.reduce(
        (sum, child) => sum + (child.key.length > (isMobile ? AUTO_PROSE_VIEW_MIN_CHARS_MOBILE : AUTO_PROSE_VIEW_MIN_CHARS_DESKTOP) ? 1 : 0),
        0
      ) > children.length / 2

      // default browser behavior in prose mode
      if ((isProseView || isAutoProseView) && window.getSelection().focusOffset > 0) {
        e.allowDefault()
      }
      else {
        // select prev editable
        selectPrevEditable(e.target)
      }

    }
    // if no cursor, select first editable
    else {
      const firstEditable = document.querySelector('.editable')
      if (firstEditable) {
        firstEditable.focus()
      }
    }
  }
}
