import { isDocumentEditable, pathToContext } from '../util'
import { hasChild } from '../selectors'
import { indent } from '../action-creators'
import { Shortcut, State } from '../@types'
import * as selection from '../device/selection'

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

  // isActive is not enough on its own, because there is a case where there is a selection object but no focusNode and we want to still execute the shortcut
  if (!selection.isActive() && selection.isText()) return false

  return isDocumentEditable() && cursor && selection.offset() === 0 && !immovable() && !readonly()
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = dispatch => dispatch(indent())

const indentOnSpace: Shortcut = {
  id: 'indentOnSpace',
  label: 'indentOnSpace',
  description: 'Indent thought if cursor is at the begining of the thought',
  keyboard: { key: ' ' },
  hideFromInstructions: true,
  canExecute,
  exec,
}

// also match Shift + Space
export const indentOnSpaceAlias: Shortcut = {
  id: 'indentOnSpaceAlias',
  label: 'indentOnSpaceAlias',
  keyboard: { key: ' ', shift: true },
  hideFromInstructions: true,
  canExecute,
  exec,
}

export default indentOnSpace
