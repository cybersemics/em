import { isMobile } from '../browser'
import { hasAttribute } from '../selectors'
import PencilIcon from '../components/icons/PencilIcon'

// util
import {
  asyncFocus,
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
  gesture: 'rdlr',
  svg: PencilIcon,
  canExecute: () => isDocumentEditable(),
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor, noteFocus } = state

    if (cursor) {
      const context = pathToContext(cursor)
      const hasNote = hasAttribute(state, context, '=note')

      if (isMobile) {
        asyncFocus()
      }

      if (!hasNote) {
        dispatch({
          type: 'setAttribute',
          context,
          key: '=note',
          value: ''
        })
      }

      // focus selection on note
      setTimeout(() => {
        try {
          const thoughtEl = editableNode(cursor)
          if (noteFocus) {
            thoughtEl.focus()
            setSelection(thoughtEl, { end: true })
          }
          else {
            const noteEl = thoughtEl.closest('.thought-container').querySelector('.note [contenteditable]')
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
