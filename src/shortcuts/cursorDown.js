import { store } from '../store.js'

// util
import {
  autoProse,
  contextOf,
  hashContext,
  headValue,
  selectNextEditable,
} from '../util.js'

export default {
  id: 'cursorDown',
  name: 'Cursor Down',
  keyboard: { key: 'ArrowDown' },
  hideFromInstructions: true,
  exec: e => {

    const { cursor, proseViews = {} } = store.getState()

    if (cursor) {

      const path = contextOf(cursor)
      const isProseView = proseViews[hashContext(path)]

      // default browser behavior in prose mode
      if ((isProseView || autoProse(path)) && window.getSelection().focusOffset < headValue(cursor).length - 1) {
        e.allowDefault()
      }
      // select next editable
      else {
        selectNextEditable(e.target)
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
