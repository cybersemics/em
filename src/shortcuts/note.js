import { store } from '../store'
import setAttribute from '../action-creators/setAttribute'

// components
import PencilIcon from '../components/icons/PencilIcon'

// util
import {
  attribute,
  editableNode,
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
    const { cursor } = store.getState()
    if (cursor) {
      const context = pathToContext(cursor)
      const note = attribute(context, '=note')
      store.dispatch(setAttribute(context, '=note', note || ''))

      // focus selection on note
      setTimeout(() => {
        try {
          const noteEl = editableNode(cursor).parentNode.nextSibling.firstChild
          setSelection(noteEl, { end: true })
        }
        catch (e) {
          console.warn('Note element not found in DOM.', context)
        }
      }, 0)
    }
  }
}
