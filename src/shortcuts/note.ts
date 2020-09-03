import { isMobile } from '../browser'
import { hasChild } from '../selectors'
import PencilIcon from '../components/icons/PencilIcon'
import { asyncFocus, headId, isDocumentEditable, pathToContext } from '../util'
import { Context, Shortcut } from '../types'
import { Dispatch } from 'react'
import { State } from '../util/initialState'

interface SetAttribute {
  type: 'setAttribute',
  context: Context,
  key: string,
  value: string,
}

interface SetNoteFocusId {
  type: 'setNoteFocusThoughtId',
  value: string | null,
}

const noteShortcut: Shortcut = {
  id: 'note',
  name: 'Note',
  description: 'Add a small note beneath a thought.',
  keyboard: { alt: true, meta: true, key: 'n' },
  gesture: 'rdlr',
  svg: PencilIcon,
  canExecute: () => isDocumentEditable(),
  exec: (dispatch: Dispatch<SetAttribute|SetNoteFocusId>, getState: () => State) => {
    const state = getState()
    const { cursor } = state

    // check cursor in exec so that the default browser behavior is always prevented
    if (!cursor) return

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

      dispatch({
        type: 'setNoteFocusThoughtId',
        value: headId(cursor) ?? null
      })
    }
  }
}

export default noteShortcut
