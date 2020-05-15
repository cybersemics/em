import { isMobile } from '../browser'
import setAttribute from '../action-creators/setAttribute'

// components
import PencilIcon from '../components/icons/PencilIcon'

// util
import {
  asyncFocus,
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
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor, noteFocus } = state

    if (cursor) {
      const context = pathToContext(cursor)
      const hasNote = hasAttribute(context, '=note')

      if (isMobile) {
        asyncFocus()
      }

      if (!hasNote) {
        dispatch(setAttribute(context, '=note', ''))
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
