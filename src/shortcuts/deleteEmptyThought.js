import React from 'react'
import { store } from '../store'

// action-creators
import { deleteEmptyThought } from '../action-creators/deleteEmptyThought'

// util
import {
  contextOf,
  getThoughtBefore,
  headValue,
  isContextViewActive,
  isDivider,
  lastThoughtsFromContextChain,
  splitChain,
} from '../util'

// selectors
import getThoughtsRanked from '../selectors/getThoughtsRanked'

const canExecute = () => {
  const state = store.getState()
  const { cursor, contextViews } = state
  const offset = window.getSelection().focusOffset

  if (cursor) {
    const showContexts = isContextViewActive(contextOf(cursor), { state: store.getState() })
    const contextChain = splitChain(cursor, contextViews)
    const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
    const hasChildren = getThoughtsRanked(state, thoughtsRanked).length > 0
    const prevThought = getThoughtBefore(cursor)
    const isAtStart = offset === 0 && !showContexts
    const hasChildrenAndPrevDivider = prevThought && isDivider(prevThought.value) && hasChildren

    // delete if the current thought is a divider
    // delete if the browser selection as at the start of the thought (either deleting or merging if it has children)
    // do not merge if previous thought is a divider
    return isDivider(headValue(cursor)) || (isAtStart && !hasChildrenAndPrevDivider)
  }
}

const exec = () => store.dispatch(deleteEmptyThought())

const Icon = ({ fill = 'black', size = 20, style }) => <svg version="1.1" className="icon" xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill={fill} style={style} viewBox="0 0 19.481 19.481" enableBackground="new 0 0 19.481 19.481">
  <g>
    <path d="m10.201,.758l2.478,5.865 6.344,.545c0.44,0.038 0.619,0.587 0.285,0.876l-4.812,4.169 1.442,6.202c0.1,0.431-0.367,0.77-0.745,0.541l-5.452-3.288-5.452,3.288c-0.379,0.228-0.845-0.111-0.745-0.541l1.442-6.202-4.813-4.17c-0.334-0.289-0.156-0.838 0.285-0.876l6.344-.545 2.478-5.864c0.172-0.408 0.749-0.408 0.921,0z" />
  </g>
</svg>

export default {
  id: 'deleteEmptyThought',
  name: 'Delete Empty Thought',
  keyboard: { key: 'Backspace' },
  hideFromInstructions: true,
  svg: Icon,
  canExecute,
  exec
}

// also match Shift + Backspace
export const deleteEmptyThoughtAlias = {
  id: 'deleteEmptyThoughtAlias',
  keyboard: { key: 'Backspace', shift: true },
  hideFromInstructions: true,
  canExecute,
  exec
}
