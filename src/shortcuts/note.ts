import { Shortcut } from '../@types'
import { setAttribute, setNoteFocus } from '../action-creators'
import { isTouch } from '../browser'
import PencilIcon from '../components/icons/PencilIcon'
import { HOME_PATH } from '../constants'
import { attribute, hasChild, simplifyPath } from '../selectors'
import { asyncFocus, editableNode, isDocumentEditable, pathToContext, setSelection } from '../util'

const noteShortcut: Shortcut = {
  id: 'note',
  label: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { key: 'n', alt: true, meta: true },
  gesture: 'rdlr',
  svg: PencilIcon,
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const { cursor, noteFocus } = state

    // check cursor in exec so that the default browser behavior is always prevented
    if (!cursor) return

    const context = pathToContext(cursor!)
    const hasNote = hasChild(state, context, '=note')

    if (isTouch) {
      asyncFocus()
    }

    if (!hasNote) {
      dispatch(
        setAttribute({
          context,
          key: '=note',
          value: '',
        }),
      )
    }

    // focus selection on note
    // delay to allow the note to be created before setting the selection
    // only causes a problem when using the toolbar, not from keyboard activation
    setTimeout(() => {
      try {
        const thoughtEl = editableNode(cursor!)
        if (!thoughtEl) return

        // select thought
        if (noteFocus) {
          thoughtEl.focus()
          setSelection(thoughtEl, { end: true })
          dispatch(setNoteFocus({ value: false }))
        }
        // select note
        else {
          const closest = thoughtEl.closest('.thought-container')
          if (!closest) return
          const noteEl = closest.querySelector('.note [contenteditable]') as HTMLElement
          if (!noteEl) return
          noteEl.focus()
          setSelection(noteEl, { end: true })
        }
      } catch (e) {
        console.warn('Note element not found in DOM.', context)
      }
    }, 0)
  },
  isActive: getState => {
    const state = getState()
    const { cursor } = state
    const context = pathToContext(cursor ? simplifyPath(state, cursor) : HOME_PATH)
    return attribute(state, context, '=note') != null
  },
}

export default noteShortcut
