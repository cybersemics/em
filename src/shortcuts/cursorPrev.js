import { store } from '../store.js'

// util
import {
  prevEditable,
} from '../util.js'
import { cursorPrevSVG } from '../svgs'

export default {
  id: 'cursorPrev',
  name: 'Cursor Previous Thought',
  description: 'Move cursor to previous thought, skipping expanded children.',
  gesture: 'lur',
  svg: cursorPrevSVG,
  keyboard: { key: 'ArrowUp', meta: true },
  exec: () => {
    const { cursor } = store.getState()
    const prev = prevEditable(cursor)
    if (prev) {
      prev.focus()
    }
  }
}
