// util
import {
  isDocumentEditable,
  pathToContext,
} from '../util'

// selectors
import { hasChild } from '../selectors'

const indentOnSpace = {
  id: 'indentOnSpace',
  name: 'indentOnSpace',
  description: 'Indent thought if cursor is at the begining of the thought',
  keyboard: { key: ' ' },
  canExecute: getState => {
    const state = getState()
    const { cursor } = state
    const cursorContext = pathToContext(cursor)

    // eslint-disable-next-line
    const immovable = () => hasChild(state, cursorContext, '=immovable')
    // eslint-disable-next-line
    const readonly = () => hasChild(state, cursorContext, '=readonly')

    const offset = window.getSelection().focusOffset

    return isDocumentEditable() && cursor && offset === 0 && !immovable() && !readonly()
  },
  exec: (dispatch, getState) => {
    dispatch({ type: 'indent' })
  }
}

export default indentOnSpace
