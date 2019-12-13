import { store } from '../store.js'

// util
import {
  prevEditable,
} from '../util.js'

export default {
  id: 'cursorPrev',
  name: 'Cursor Previous Item',
  description: 'Move cursor to previous thought, skipping expanded children.',
  gesture: 'lur',
  keyboard: { key: 'ArrowUp', meta: true },
  exec: () => {
    const { cursor } = store.getState()
    const prev = prevEditable(cursor)
    if (prev) {
      prev.focus()
    }
  }
}
