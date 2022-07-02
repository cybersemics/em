import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import indent from '../action-creators/indent'
import * as selection from '../device/selection'
import findDescendant from '../selectors/findDescendant'
import head from '../util/head'
import isDocumentEditable from '../util/isDocumentEditable'

// eslint-disable-next-line jsdoc/require-jsdoc
const canExecute = (getState: () => State) => {
  const state = getState()
  const { cursor } = state
  if (!cursor) return false

  /** Returns true if the cursor is immovable. */
  const immovable = () => findDescendant(state, head(cursor), '=immovable')

  /** Returns true if the cursor is readonly. */
  const readonly = () => findDescendant(state, head(cursor), '=readonly')

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
