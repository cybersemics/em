import isDocumentEditable from '../util/isDocumentEditable'
import cursorCleared from '../action-creators/cursorCleared'
import Shortcut from '../@types/Shortcut'

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
