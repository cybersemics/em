import { Shortcut } from '../@types'
import { isDocumentEditable, pathToContext } from '../util'

/** Toggle the built-in =done style to cross out an item. */
const toggleDone: Shortcut = {
  id: 'toggleDone',
  label: 'Mark as done',
  keyboard: { alt: true, shift: true, key: 'Enter' },
  canExecute: getState => isDocumentEditable() && !!getState().cursor,
  exec: (dispatch, getState) => {
    const state = getState()
    const cursor = state.cursor!
    const context = pathToContext(state, cursor)
    dispatch({
      type: 'toggleAttribute',
      context,
      key: '=done',
    })
  },
}

export default toggleDone
