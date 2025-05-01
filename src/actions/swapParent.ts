import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import { registerActionMetadata } from '../util/actionMetadata.registry'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import alert from './alert'
import setCursor from './setCursor'

/** Swaps the current cursor's thought with its parent by moving nodes. */
const swapParent = (state: State): State => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  // disallow swapParent in context view
  if (
    isContextViewActive(state, rootedParentOf(state, cursor)) ||
    isContextViewActive(state, rootedParentOf(state, parentOf(cursor))) ||
    isContextViewActive(state, cursor)
  ) {
    return alert(state, { value: 'Swap Parent cannot be performed in the context view.' })
  }

  // Get the parent path directly from the cursor
  const parent = parentOf(cursor)

  // If the cursor is at the root, do nothing.
  if (!parent.length) return state

  const childId = head(cursor)
  const parentId = head(parent)

  const childThought = getThoughtById(state, childId)
  const parentThought = getThoughtById(state, parentId)
  if (!childThought || !parentThought) return state

  // Get only direct children of the child thought (grandchildren)
  const childChildren = getChildrenRanked(state, childId)

  // Get siblings (other children of parent excluding the child being swapped)
  const parentChildren = getChildrenRanked(state, parentId)
  const siblings = parentChildren.filter(sibling => sibling.id !== childId)

  // Get the grandparent path
  const grandparent = parentOf(parent)

  return reducerFlow([
    // First move the child to replace its parent's position
    moveThought({
      oldPath: simplifyPath(state, cursor),
      newPath: simplifyPath(state, parent),
      newRank: parentThought.rank,
    }),

    // Then move the parent under the child
    moveThought({
      oldPath: simplifyPath(state, parent),
      newPath: simplifyPath(state, [...grandparent, childId, parentId]),
      newRank: childThought.rank,
    }),

    // Move siblings under the child
    ...siblings.map(sibling =>
      moveThought({
        oldPath: simplifyPath(state, [...parent, sibling.id]),
        newPath: simplifyPath(state, [...grandparent, childId, sibling.id]),
        newRank: sibling.rank,
      }),
    ),

    // Move grandchildren under the parent's new position
    ...childChildren.map(grandchild =>
      moveThought({
        oldPath: simplifyPath(state, [...cursor, grandchild.id]),
        newPath: simplifyPath(state, [...grandparent, childId, parentId, grandchild.id]),
        newRank: grandchild.rank,
      }),
    ),

    // Keep cursor on the child at its new position
    setCursor({
      path: [...grandparent, childId, parentId],
      offset: parentThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)

// Register this action's metadata
registerActionMetadata('swapParent', {
  undoable: true,
})
