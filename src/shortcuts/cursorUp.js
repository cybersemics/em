import { store } from '../store.js'

// util
import {
  autoProse,
  contextOf,
  hashContext,
  selectPrevEditable,
} from '../util.js'

import { cursorUpSVG } from '../svgs'

export default {
  id: 'cursorUp',
  name: 'Cursor Up',
  keyboard: { key: 'ArrowUp' },
  hideFromInstructions: true,
  svg: cursorUpSVG,
  exec: e => {

    const { cursor, proseViews = {} } = store.getState()

    if (cursor) {

      const path = contextOf(cursor)
      const isProseView = proseViews[hashContext(path)]

      // default browser behavior in prose mode
      if ((isProseView || autoProse(path)) && window.getSelection().focusOffset > 0) {
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
