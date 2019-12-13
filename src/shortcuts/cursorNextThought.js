import { store } from '../store.js'

// util
import {
  nextEditable,
} from '../util.js'

export default {
    id: 'cursorNextThought',
    name: 'Cursor Next Thought',
    description: 'Move the cursor to the next thought, skipping expanded children.',
    keyboard: { key: 'ArrowDown', meta: true },
    exec: () => {
      const { cursor } = store.getState()

      // select next editable
      if (cursor) {
        const next = nextEditable(cursor)
        if (next) {
          next.focus()
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
