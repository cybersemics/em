import React from 'react'

// util
import {
  contextOf,
  ellipsize,
  headValue,
  isDivider,
  isDocumentEditable,
  isFunction,
  pathToContext,
  unroot,
} from '../util'

// selectors
import {
  getThoughtBefore,
  getThoughts,
  getThoughtsRanked,
  hasChild,
  isContextViewActive,
  lastThoughtsFromContextChain,
  splitChain,
} from '../selectors'

/** Returns true if the cursor is on an empty though or divider that can be deleted. */
const canExecuteDeleteEmptyThought = state => {
  const { cursor } = state
  const offset = window.getSelection().focusOffset

  // can't delete if there is no cursor, the document is not editable, or the caret is not at the beginning of the thought
  if (!cursor || !isDocumentEditable() || offset > 0) return false

  // can delete if the current thought is a divider
  if (isDivider(headValue(cursor))) return true

  // can't delete in context view (TODO)
  const showContexts = isContextViewActive(state, contextOf(cursor))
  if (showContexts) return false

  const contextChain = splitChain(state, cursor)
  const thoughtsRanked = lastThoughtsFromContextChain(state, contextChain)
  const hasChildren = getThoughtsRanked(state, thoughtsRanked).length > 0
  const prevThought = getThoughtBefore(state, cursor)
  const hasChildrenAndPrevDivider = prevThought && isDivider(prevThought.value) && hasChildren

  // delete if the browser selection as at the start of the thought (either deleting or merging if it has children)
  // do not merge if previous thought is a divider
  return !hasChildrenAndPrevDivider
}

/** An action-creator thunk that dispatches deleteEmptyThought. */
const deleteEmptyThought = (dispatch, getState) => {
  const state = getState()
  const { cursor } = state

  const prevThought = getThoughtBefore(state, cursor)
  // Determine if thought at cursor is uneditable
  const contextOfCursor = pathToContext(cursor)
  const uneditable = contextOfCursor && hasChild(state, contextOfCursor, '=uneditable')

  if (prevThought && uneditable) {
    dispatch({ type: 'error', value: `"${ellipsize(headValue(cursor))}" is uneditable and cannot be merged.` })
    return
  }

  dispatch({ type: 'deleteEmptyThought' })
}

/** A selector that returns true if the cursor is on an only child that can be outdented by the delete command. */
const canExecuteOutdent = state => {
  const { cursor } = state

  const parentContext = contextOf(pathToContext(cursor))
  const children = getThoughts(state, parentContext)

  const offset = window.getSelection().focusOffset

  // eslint-disable-next-line
  const filteredChildren = () => children.filter(child => state.showHiddenThoughts ||
    // exclude meta thoughts when showHiddenThoughts is off
    (!isFunction(child.value) && !hasChild(state, unroot(parentContext.concat(child.value)), '=hidden'))
  )
  return isDocumentEditable() && headValue(cursor).length !== 0 && offset === 0 && filteredChildren().length === 1
}

/** A selector that returns true if either the cursor is on an empty thought that can be deleted, or is on an only child that can be outdented. */
const canExecute = getState => {
  const state = getState()
  return canExecuteOutdent(state) || canExecuteDeleteEmptyThought(state)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec = (dispatch, getState) => {
  if (canExecuteOutdent(getState())) {
    dispatch({ type: 'outdent' })
  }
  // since canExecute has already evaluated to true, we know that canExecuteDeleteEmptyThought is true
  else {
    dispatch(deleteEmptyThought)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
  <g>
    <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" />
  </g>
</svg>

const deleteEmptyThoughtOrOutdent = {
  id: 'deleteEmptyThoughtOrOutdent',
  name: 'Delete Empty Thought Or Outdent',
  keyboard: { key: 'Backspace' },
  hideFromInstructions: true,
  svg: Icon,
  canExecute,
  exec
}

// also match Shift + Backspace
export const deleteEmptyThoughtOrOutdentAlias = {
  id: 'deleteEmptyThoughtOrOutdentAlias',
  keyboard: { key: 'Backspace', shift: true },
  hideFromInstructions: true,
  canExecute,
  exec
}

export default deleteEmptyThoughtOrOutdent
