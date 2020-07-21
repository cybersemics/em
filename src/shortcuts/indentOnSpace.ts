import { isDocumentEditable, pathToContext } from '../util'
import { hasChild } from '../selectors'
import { State } from '../util/initialState'
import { Dispatch } from 'react'
import { Action } from 'redux'

const indentOnSpace = {
  id: 'indentOnSpace',
  name: 'indentOnSpace',
  description: 'Indent thought if cursor is at the begining of the thought',
  keyboard: { key: ' ' },
  canExecute: (getState: () => State) => {
    const state = getState()
    const { cursor } = state
    if (!cursor) return false

    const cursorContext = pathToContext(cursor)

    // eslint-disable-next-line
    const immovable = () => hasChild(state, cursorContext, '=immovable')
    // eslint-disable-next-line
    const readonly = () => hasChild(state, cursorContext, '=readonly')

    const selection = window.getSelection()
    if (!selection) return false
    const offset = selection.focusOffset

    return isDocumentEditable() && cursor && offset === 0 && !immovable() && !readonly()
  },
  exec: (dispatch: Dispatch<Action>) => {
    dispatch({ type: 'indent' })
  }
}

export default indentOnSpace
