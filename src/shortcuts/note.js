import { store } from '../store.js'
import setAttribute from '../action-creators/setAttribute.js'

// components
import { PencilIcon } from '../components/icons/PencilIcon'

// util
import {
  attribute,
  editableNode,
  pathToContext,
  setSelection,
} from '../util.js'

export default {
  id: 'note',
  name: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { alt: true, meta: true, key: 'n' },
  svg: PencilIcon,
  exec: () => {
    const { cursor } = store.getState().present
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
