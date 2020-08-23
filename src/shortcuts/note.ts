import { isMobile } from '../browser'
import { hasChild } from '../selectors'
import PencilIcon from '../components/icons/PencilIcon'
import { asyncFocus, editableNode, isDocumentEditable, pathToContext, setSelection } from '../util'
import { Context, Shortcut } from '../types'
import { Dispatch } from 'react'
import { State } from '../util/initialState'

interface SetAttribute {
  type: 'setAttribute',
  context: Context,
  key: string,
  value: string,
}

const noteShortcut: Shortcut = {
  id: 'note',
  name: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { alt: true, meta: true, key: 'n' },
  gesture: 'rdlr',
  svg: PencilIcon,
  canExecute: (getState: () => State) => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch: Dispatch<SetAttribute>, getState: () => State) => {
    const state = getState()
    const { cursor, cursorBeforeEdit, noteFocus } = state

    const context = pathToContext(cursor!)
    const hasNote = hasChild(state, context, '=note')

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
        const thoughtEl = editableNode(cursorBeforeEdit!)
        if (!thoughtEl) return
        if (noteFocus) {
          thoughtEl.focus()
          setSelection(thoughtEl, { end: true })
        }
        else {
          const closest = thoughtEl.closest('.thought-container')
          if (!closest) return
          const noteEl = closest.querySelector('.note [contenteditable]') as HTMLElement
          if (!noteEl) return
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

export default noteShortcut
