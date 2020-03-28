import React from 'react'
import { store } from '../store.js'

// action-creators
import { deleteEmptyThought } from '../action-creators/deleteEmptyThought'

// util
import {
  contextOf,
  getThoughtsRanked,
  getThoughtBefore,
  headValue,
  isContextViewActive,
  isDivider,
  lastThoughtsFromContextChain,
  splitChain,
} from '../util.js'

const canExecute = () => {
  const { cursor, contextViews } = store.getState()
  const offset = window.getSelection().focusOffset
  const prevThought = getThoughtBefore(cursor)

  // Do nothing if previous thought is a divider
  if (prevThought && isDivider(prevThought.value)) return false

  if (cursor) {
    const showContexts = isContextViewActive(contextOf(cursor), { state: store.getState() })
    const contextChain = splitChain(cursor, contextViews)
    const thoughtsRanked = lastThoughtsFromContextChain(contextChain)
    const children = getThoughtsRanked(thoughtsRanked)

    return ((headValue(cursor) === '' && children.length === 0) || isDivider(headValue(cursor))) || (offset === 0 && !showContexts)
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
