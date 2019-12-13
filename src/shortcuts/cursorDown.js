import { store } from '../store.js'

// util
import {
  selectNextEditable,
} from '../util.js'

export default {
  id: 'cursorDown',
  name: 'Cursor Down',
  keyboard: { key: 'ArrowDown' },
  hideFromInstructions: true,
  exec: e => {
    // select next editable
    if (store.getState().cursor) {
      selectNextEditable(e.target)
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
