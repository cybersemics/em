// util
import {
  isDocumentEditable,
  setSelection,
} from '../util'

export default {
  id: 'clearThought',
  name: 'Clear Thought',
  description: 'Clear the text of the current thought.',
  gesture: 'rl',
  canExecute: () => isDocumentEditable(),
  exec: () => {
    const editable = document.querySelector('.editing .editable')
    if (editable) {
      editable.innerHTML = ''
      setSelection(editable)
    }
  }
}
