import { store } from '../store.js'
import setAttribute from '../action-creators/setAttribute.js'

// components
import { PencilIcon } from '../components/icons/PencilIcon'

// util
import {
  editableNode,
  pathToContext,
} from '../util.js'

export default {
  id: 'note',
  name: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { alt: true, meta: true, key: 'n' },
  svg: PencilIcon,
  exec: () => {
    const { cursor } = store.getState()
    if (cursor) {
      store.dispatch(setAttribute(pathToContext(cursor), '=note', ''))

      // focus selection on note
      setTimeout(() => {
        try {
          const noteEditable = editableNode(cursor).parentNode.nextSibling.firstChild
          noteEditable.focus()
        }
        catch (e) {
          console.warn('Note element not found in DOM.')
        }
      }, 0)
    }
  }
}
