import { Key } from 'ts-key-enum'
import Command from '../@types/Command'
import State from '../@types/State'
import { deleteEmptyThoughtActionCreator as deleteEmptyThought } from '../actions/deleteEmptyThought'
import { outdentActionCreator as outdent } from '../actions/outdent'
import DeleteEmptyThoughtIcon from '../components/icons/DeleteEmptyThoughtIcon'
import * as selection from '../device/selection'
import { getChildren, getChildrenRanked } from '../selectors/getChildren'
import getThoughtBefore from '../selectors/getThoughtBefore'
import hasMulticursor from '../selectors/hasMulticursor'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import headValue from '../util/headValue'
import isDivider from '../util/isDivider'
import isDocumentEditable from '../util/isDocumentEditable'

/** Returns true if the cursor is on an empty though or divider that can be deleted. */
const canExecuteDeleteEmptyThought = (state: State) => {
  const { cursor } = state

  // isActive is not enough on its own, because there is a case where there is a selection object but no focusNode and we want to still execute the command
  if (!selection.isActive() && selection.isText()) return false

  // can't delete if there is no cursor, there is a selection range, the document is not editable, or the caret is not at the beginning of the thought
  if (!cursor || !isDocumentEditable() || selection.offset()! > 0 || !selection.isCollapsed()) return false

  const simplePath = simplifyPath(state, cursor)

  // can delete if the current thought is a divider
  if (isDivider(headValue(state, cursor))) return true

  const hasChildren = getChildrenRanked(state, head(simplePath)).length > 0
  const prevThought = getThoughtBefore(state, simplePath)
  const hasChildrenAndPrevDivider = prevThought && isDivider(prevThought.value) && hasChildren

  // delete if the browser selection as at the start of the thought (either deleting or merging if it has children)
  // do not merge if previous thought is a divider
  return !hasChildrenAndPrevDivider
}

/** A selector that returns true if the cursor is on an only child that can be outdented by the delete command. */
const canExecuteOutdent = (state: State) => {
  const { cursor } = state

  return (
    cursor &&
    (selection.isActive() || !selection.isText()) &&
    selection.offset() === 0 &&
    selection.isCollapsed() &&
    isDocumentEditable() &&
    headValue(state, cursor)?.length !== 0 &&
    getChildren(state, head(rootedParentOf(state, cursor))).length === 1
  )
}

/** A selector that returns true if either the cursor is on an empty thought that can be deleted, or is on an only child that can be outdented. */
const canExecute = (state: State) => {
  return canExecuteOutdent(state) || canExecuteDeleteEmptyThought(state) || hasMulticursor(state)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Command['exec'] = (dispatch, getState) => {
  const state = getState()
  if (state.cursorCleared) {
    dispatch(deleteEmptyThought)
  } else if (canExecuteOutdent(state)) {
    dispatch(outdent())
  } else {
    dispatch(deleteEmptyThought)
  }
}

const deleteEmptyThoughtOrOutdent: Command = {
  id: 'deleteEmptyThoughtOrOutdent',
  label: 'Delete Empty Thought Or Outdent',
  keyboard: { key: Key.Backspace },
  hideFromHelp: true,
  multicursor: {
    preventSetCursor: true,
    reverse: true,
  },
  svg: DeleteEmptyThoughtIcon,
  canExecute,
  exec,
}

// also match Shift + Backspace
export const deleteEmptyThoughtOrOutdentAlias: Command = {
  id: 'deleteEmptyThoughtOrOutdentAlias',
  label: 'Delete Empty Thought Or Outdent (alias)',
  keyboard: { key: Key.Backspace, shift: true },
  hideFromHelp: true,
  multicursor: {
    preventSetCursor: true,
    reverse: true,
  },
  canExecute,
  exec,
}

export default deleteEmptyThoughtOrOutdent
