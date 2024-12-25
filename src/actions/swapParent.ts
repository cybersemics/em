import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import editThought from '../actions/editThought'
import getThoughtById from '../selectors/getThoughtById'
import simplifyPath from '../selectors/simplifyPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

/** Swaps the current cursor's thought with its parent. */
const swapParent = (state: State) => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  const parent = parentOf(cursor)

  // If the cursor is at the root, do nothing.
  if (!parent.length) return state

  const childValue = getThoughtById(state, head(cursor))!.value
  const parentValue = getThoughtById(state, head(parent))!.value
  if (!childValue || !parentValue) return state

  const reducers = [
    editThought({
      oldValue: childValue,
      newValue: parentValue,
      path: simplifyPath(state, cursor),
      force: true,
    }),
    editThought({
      oldValue: parentValue,
      newValue: childValue,
      path: simplifyPath(state, parent),
    }),
  ]

  return reducerFlow(reducers)(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)
