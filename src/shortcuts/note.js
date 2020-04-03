import { store } from '../store'
import setAttribute from '../action-creators/setAttribute'

// components
import PencilIcon from '../components/icons/PencilIcon'

// util
import {
  editableNode,
  pathToContext,
  setSelection,
} from '../util'

// selectors
import attribute from '../selectors/attribute'

export default {
  id: 'note',
  name: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { alt: true, meta: true, key: 'n' },
  svg: PencilIcon,
  exec: () => {
    const state = store.getState()
    const cursor = state.cursor

    if (cursor) {
      const context = pathToContext(cursor)
      const note = attribute(state, context, '=note')
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
