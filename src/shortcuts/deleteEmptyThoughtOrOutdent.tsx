import React from 'react'
import { Key } from 'ts-key-enum'
import { asyncFocus, ellipsize, headValue, isDivider, isDocumentEditable, parentOf, pathToContext } from '../util'
import { getChildren, getThoughtBefore, getAllChildren, getChildrenRanked, hasChild, isContextViewActive, lastThoughtsFromContextChain, simplifyPath, splitChain } from '../selectors'
import { State } from '../util/initialState'
import { HOME_PATH } from '../constants'
import { isTouch } from '../browser'
import { alert, deleteEmptyThought as deleteEmptyThoughtActionCreator, error, outdent } from '../action-creators'
import { Icon as IconType, Shortcut, Thunk } from '../types'

/** Returns true if the cursor is on an empty though or divider that can be deleted. */
const canExecuteDeleteEmptyThought = (state: State) => {
  const { cursor } = state
  const sel = window.getSelection()
  if (!sel) return false

  // can't delete if there is no cursor, there is a selection range, the document is not editable, or the caret is not at the beginning of the thought
  if (!cursor || !isDocumentEditable() || sel.focusOffset > 0 || !sel.isCollapsed) return false

  const simplePath = simplifyPath(state, cursor)

  // can delete if the current thought is a divider
  if (isDivider(headValue(cursor))) return true

  // can't delete in context view (TODO)
  const showContexts = isContextViewActive(state, pathToContext(parentOf(cursor)))
  if (showContexts) return false

  const contextChain = splitChain(state, cursor)
  const path = lastThoughtsFromContextChain(state, contextChain)
  const hasChildren = getChildrenRanked(state, pathToContext(path)).length > 0
  const prevThought = getThoughtBefore(state, simplePath)
  const hasChildrenAndPrevDivider = prevThought && isDivider(prevThought.value) && hasChildren

  // delete if the browser selection as at the start of the thought (either deleting or merging if it has children)
  // do not merge if previous thought is a divider
  return !hasChildrenAndPrevDivider
}

/** A thunk that dispatches deleteEmptyThought. */
const deleteEmptyThought: Thunk = (dispatch, getState) => {
  const state = getState()
  const { cursor, editing } = state
  if (!cursor) return

  const simplePath = simplifyPath(state, cursor)
  const prevThought = getThoughtBefore(state, simplePath)
  // Determine if thought at cursor is uneditable
  const contextOfCursor = pathToContext(cursor)
  const uneditable = contextOfCursor && hasChild(state, contextOfCursor, '=uneditable')
  const children = getChildren(state, contextOfCursor)

  if (prevThought && uneditable) {
    dispatch(error({ value: `'${ellipsize(headValue(cursor))}' is uneditable and cannot be merged.` }))
    return
  }

  // empty thought on mobile
  if (isTouch && editing && ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor)))) {
    asyncFocus()
  }

  dispatch(deleteEmptyThoughtActionCreator())
}

/** A selector that returns true if the cursor is on an only child that can be outdented by the delete command. */
const canExecuteOutdent = (state: State) => {
  const { cursor } = state
  const selection = window.getSelection()

  if (!cursor || !selection) return false

  const offset = selection.focusOffset
  return cursor &&
    offset === 0 &&
    isDocumentEditable() &&
    headValue(cursor).length !== 0 &&
    getChildren(state, parentOf(pathToContext(cursor))).length === 1
}

/** A selector that returns true if merged thought value is duplicate. */
const isMergedThoughtDuplicate = (state: State) => {
  const { cursor, editingValue } = state
  if (!cursor) return false
  // If we are going to delete empty thought
  if (headValue(cursor) === '' || editingValue === '') return false

  const simplePath = simplifyPath(state, cursor)
  const prevThought = getThoughtBefore(state, simplePath)
  if (!prevThought) return false
  const contextChain = splitChain(state, cursor)
  const showContexts = isContextViewActive(state, pathToContext(parentOf(cursor)))
  const path = lastThoughtsFromContextChain(state, contextChain)
  const mergedThoughtValue = prevThought.value + headValue(cursor)
  const context = pathToContext(showContexts && contextChain.length > 1 ? contextChain[contextChain.length - 2]
    : !showContexts && path.length > 1 ? parentOf(path) :
    HOME_PATH)
  const siblings = getAllChildren(state, context)
  const isDuplicate = !siblings.every(thought => thought.value !== mergedThoughtValue)
  return isDuplicate
}

/** A selector that returns true if either the cursor is on an empty thought that can be deleted, or is on an only child that can be outdented. */
const canExecute = (getState: () => State) => {
  const state = getState()
  return canExecuteOutdent(state) || canExecuteDeleteEmptyThought(state)
}

// eslint-disable-next-line jsdoc/require-jsdoc
const exec: Shortcut['exec'] = (dispatch, getState) => {
  if (canExecuteOutdent(getState())) {
    dispatch(outdent())
  }
  // additional check for duplicates
  else if (isMergedThoughtDuplicate(getState())) {
    dispatch(alert('Duplicate thoughts are not allowed within the same context.', { alertType: 'duplicateThoughts', clearTimeout: 2000 }))
  }
  else {
    dispatch(deleteEmptyThought)
  }
}

// eslint-disable-next-line jsdoc/require-jsdoc
const Icon = ({ fill = 'black', size = 20, style }: IconType) => <svg version='1.1' className='icon' xmlns='http://www.w3.org/2000/svg' width={size} height={size} fill={fill} style={style} viewBox='0 0 19.481 19.481' enableBackground='new 0 0 19.481 19.481'>
  <g>
    <path d='m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z' />
  </g>
</svg>

const deleteEmptyThoughtOrOutdent: Shortcut = {
  id: 'deleteEmptyThoughtOrOutdent',
  name: 'Delete Empty Thought Or Outdent',
  keyboard: { key: Key.Backspace },
  hideFromInstructions: true,
  svg: Icon,
  canExecute,
  exec
}

// also match Shift + Backspace
export const deleteEmptyThoughtOrOutdentAlias: Shortcut = {
  id: 'deleteEmptyThoughtOrOutdentAlias',
  name: 'Delete Empty Thought Or Outdent (alias)',
  keyboard: { key: Key.Backspace, shift: true },
  hideFromInstructions: true,
  canExecute,
  exec
}

export default deleteEmptyThoughtOrOutdent
