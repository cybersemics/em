import { Key } from 'ts-key-enum'
import { css, cx } from '../../styled-system/css'
import { icon } from '../../styled-system/recipes'
import { token } from '../../styled-system/tokens'
import IconType from '../@types/IconType'
import Shortcut from '../@types/Shortcut'
import State from '../@types/State'
import { deleteEmptyThoughtActionCreator as deleteEmptyThought } from '../actions/deleteEmptyThought'
import { outdentActionCreator as outdent } from '../actions/outdent'
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

  // isActive is not enough on its own, because there is a case where there is a selection object but no focusNode and we want to still execute the shortcut
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

  if (!cursor || (!selection.isActive() && selection.isText())) return false

  return (
    cursor &&
    selection.offset() === 0 &&
    isDocumentEditable() &&
    headValue(state, cursor).length !== 0 &&
    getChildren(state, head(rootedParentOf(state, cursor))).length === 1
  )
}

/** A selector that returns true if either the cursor is on an empty thought that can be deleted, or is on an only child that can be outdented. */
const canExecute = (state: State) => {
  return canExecuteOutdent(state) || canExecuteDeleteEmptyThought(state) || hasMulticursor(state)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState) => {
  const state = getState()
  if (state.cursorCleared) {
    dispatch(deleteEmptyThought)
  } else if (canExecuteOutdent(state)) {
    dispatch(outdent())
  } else {
    dispatch(deleteEmptyThought)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc, react-refresh/only-export-components
const Icon = ({ fill = token('colors.bg'), size = 20, style, cssRaw }: IconType) => (
  <svg
    version='1.1'
    className={cx(icon(), css(cssRaw))}
    xmlns='http://www.w3.org/2000/svg'
    width={size}
    height={size}
    fill={fill}
    style={style}
    viewBox='0 0 19.481 19.481'
    enableBackground='new 0 0 19.481 19.481'
  >
    <g>
      <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
    </g>
  </svg>
)

const deleteEmptyThoughtOrOutdent: Shortcut = {
  id: 'deleteEmptyThoughtOrOutdent',
  label: 'Delete Empty Thought Or Outdent',
  keyboard: { key: Key.Backspace },
  hideFromHelp: true,
  multicursor: {
    enabled: true,
    preventSetCursor: true,
    reverse: true,
  },
  svg: Icon,
  canExecute,
  exec,
}

// also match Shift + Backspace
export const deleteEmptyThoughtOrOutdentAlias: Shortcut = {
  id: 'deleteEmptyThoughtOrOutdentAlias',
  label: 'Delete Empty Thought Or Outdent (alias)',
  keyboard: { key: Key.Backspace, shift: true },
  hideFromHelp: true,
  multicursor: {
    enabled: true,
    preventSetCursor: true,
    reverse: true,
  },
  svg: Icon,
  canExecute,
  exec,
}

export default deleteEmptyThoughtOrOutdent
