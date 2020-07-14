// util
import {
  isDocumentEditable,
  setSelection,
} from '../util'

const tagsRegex = /<(?:.|\n)*?>/gmi

const clearThoughtShortcut = {
  id: 'clearThought',
  name: 'Clear Thought',
  description: 'Clear the text of the current thought.',
  gesture: 'rl',
  canExecute: () => isDocumentEditable(),
  exec: () => {
    const editable = document.querySelector('.editing .editable')
    if (editable) {
      // remove html tags
      const text = editable.innerHTML.replace(tagsRegex, '')
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
