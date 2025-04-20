import _ from 'lodash'
import Path from '../@types/Path'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import isContextViewActive from '../selectors/isContextViewActive'
import rootedParentOf from '../selectors/rootedParentOf'
import simplifyPath from '../selectors/simplifyPath'
import splitChain from '../selectors/splitChain'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import setCursor from './setCursor'

/** Swaps the current cursor's thought with its parent by moving nodes. */
const swapParent = (state: State) => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  // Check if we're in context view and get the context chain
  const isInContextView = isContextViewActive(state, rootedParentOf(state, cursor))
  const contextChain = isInContextView ? splitChain(state, cursor) : []

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

  // Construct the new cursor path based on the context chain segments
  let newCursorPath: Path
  if (isInContextView && contextChain.length > 1) {
    // Get the last two elements from the last segment (the ones being swapped)
    const lastSegment = contextChain[contextChain.length - 1]
    const swapElements = lastSegment.slice(-2)

    // Create new cursor path by combining:
    // 1. All segments except the last one
    // 2. All elements from the last segment except the last two
    // 3. The swapped elements in reverse order
    const combinedPath = [...contextChain[0], ...lastSegment.slice(0, -2), swapElements[1], swapElements[0]]
    newCursorPath = combinedPath as unknown as Path
  } else {
    newCursorPath = [...grandparent, childId, parentId] as Path
  }

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
      path: newCursorPath,
      offset: childThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)
