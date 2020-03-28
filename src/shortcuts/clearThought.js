// util
import {
  setSelection,
} from '../util.js'

export default {
  id: 'clearThought',
  name: 'Clear Thought',
  description: 'Clear the text of the current thought.',
  gesture: 'rl',
  exec: () => {
    const editable = document.querySelector('.editing .editable')
    if (editable) {
      editable.innerHTML = ''
      setSelection(editable)
    }
  }
}
