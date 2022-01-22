import { isDocumentEditable } from '../util'
import { cursorCleared } from '../action-creators'
import { Shortcut } from '../@types'

const clearThoughtShortcut: Shortcut = {
  id: 'clearThought',
  label: 'Clear Thought',
  description: 'Clear the text of the current thought.',
  gesture: 'rl',
  keyboard: { key: 'c', alt: true, shift: true, meta: true },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    dispatch(cursorCleared({ value: !getState().cursorCleared }))
  },
}

export default clearThoughtShortcut
