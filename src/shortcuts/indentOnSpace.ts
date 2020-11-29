import { isDocumentEditable, pathToContext } from '../util'
import { hasChild } from '../selectors'
import { indent } from '../action-creators'
import { State } from '../util/initialState'
import { Shortcut } from '../types'

// eslint-disable-next-line jsdoc/require-jsdoc
const canExecute = (getState: () => State) => {
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
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = dispatch => dispatch(indent())

const indentOnSpace: Shortcut = {
  id: 'indentOnSpace',
  name: 'indentOnSpace',
  description: 'Indent thought if cursor is at the begining of the thought',
  keyboard: { key: ' ' },
  hideFromInstructions: true,
  canExecute,
  exec,
}

// also match Shift + Space
export const indentOnSpaceAlias: Shortcut = {
  id: 'indentOnSpaceAlias',
  name: 'indentOnSpaceAlias',
  keyboard: { key: ' ', shift: true },
  hideFromInstructions: true,
  canExecute,
  exec,
}

export default indentOnSpace
