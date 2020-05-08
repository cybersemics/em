import { store } from '../store'
import setAttribute from '../action-creators/setAttribute'

// components
import PencilIcon from '../components/icons/PencilIcon'

// util
import {
  editableNode,
  hasAttribute,
  isDocumentEditable,
  pathToContext,
  setSelection,
} from '../util'

export default {
  id: 'note',
  name: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { alt: true, meta: true, key: 'n' },
  svg: PencilIcon,
  canExecute: () => isDocumentEditable(),
  exec: () => {
    const { cursor, noteFocus } = store.getState()
    if (cursor) {
      const context = pathToContext(cursor)
      const hasNote = hasAttribute(context, '=note')

      if (!hasNote) {
        store.dispatch(setAttribute(context, '=note', ''))
      }

      // focus selection on note
      setTimeout(() => {
        try {
          if (noteFocus) {
            const thoughtEl = editableNode(cursor)
            thoughtEl.focus()
            setSelection(thoughtEl, { end: true })
          }
          else {
            const noteEl = editableNode(cursor).parentNode.nextSibling.firstChild
            noteEl.focus()
            setSelection(noteEl, { end: true })
          }
        }
        catch (e) {
          console.warn('Note element not found in DOM.', context)
        }
      }, 0)
    }
  }
}
