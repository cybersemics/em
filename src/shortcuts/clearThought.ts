import { isDocumentEditable, setSelection } from '../util'
import { REGEXP_TAGS } from '../constants'
import { Shortcut } from '../types'

const clearThoughtShortcut: Shortcut = {
  id: 'clearThought',
  name: 'Clear Thought',
  description: 'Clear the text of the current thought.',
  gesture: 'rl',
  canExecute: () => isDocumentEditable(),
  exec: () => {
    const editable = document.querySelector('.editing .editable') as HTMLElement
    if (editable) {
      // remove html tags
      const text = editable.innerHTML.replace(REGEXP_TAGS, '')
      setSelection(editable)
      // need to delay DOM changes on mobile for some reason so that this works when edit mode is false
      setTimeout(() => {
        editable.innerHTML = ''
        editable.setAttribute('placeholder', text)
      })
    }
  }
}

export default clearThoughtShortcut
