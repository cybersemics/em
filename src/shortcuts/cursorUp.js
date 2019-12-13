// util
import {
  selectPrevEditable,
} from '../util.js'

export default {
  id: 'cursorUp',
  name: 'Cursor Up',
  keyboard: { key: 'ArrowUp' },
  hideFromInstructions: true,
  exec: e => {
    selectPrevEditable(e.target)
  }
}
