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
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'
import setCursor from './setCursor'

/** Swaps the current cursor's thought with its parent by moving nodes. */
const swapParent = (state: State) => {
  const { cursor } = state

  // If there is no cursor, do nothing.
  if (!cursor) return state

  // Get the actual path without context view
  const simpleCursor = simplifyPath(state, cursor)
  const parent = parentOf(simpleCursor)

  // If the cursor is at the root, do nothing.
  if (!parent.length) return state

  const childId = head(simpleCursor)
  const parentId = head(parent)

  const childThought = getThoughtById(state, childId)
  const parentThought = getThoughtById(state, parentId)
  if (!childThought || !parentThought) return state

  // Get only direct children of the child thought (grandchildren)
  const childChildren = getChildrenRanked(state, childId)

  // Get the grandparent path (parent of parent)
  const grandparent = parentOf(parent)

  // Get siblings (other children of parent excluding the child being swapped)
  const parentChildren = getChildrenRanked(state, parentId)
  const siblings = parentChildren.filter(sibling => sibling.id !== childId)

  // Check if we're in context view and get the context chain
  const isInContextView = isContextViewActive(state, rootedParentOf(state, cursor))
  const contextChain = isInContextView ? splitChain(state, cursor) : []
  const contextPrefix = isInContextView ? contextChain[0] : []

  return reducerFlow([
    // First move the child to replace its parent's position
    moveThought({
      oldPath: cursor,
      newPath: parent,
      newRank: parentThought.rank,
    }),

    // Then move the parent under the child
    moveThought({
      oldPath: parent,
      newPath: appendToPath([...contextPrefix, ...grandparent] as Path, childId, parentId),
      newRank: childThought.rank,
    }),

    // Move siblings under the child
    ...siblings.map(sibling =>
      moveThought({
        oldPath: appendToPath(parent, sibling.id),
        newPath: appendToPath([...contextPrefix, ...grandparent] as Path, childId, sibling.id),
        newRank: sibling.rank,
      }),
    ),

    // Move grandchildren under the parent's new position
    ...childChildren.map(grandchild =>
      moveThought({
        oldPath: appendToPath(cursor, grandchild.id),
        newPath: appendToPath([...contextPrefix, ...grandparent] as Path, childId, parentId, grandchild.id),
        newRank: grandchild.rank,
      }),
    ),

    // Keep cursor on the child at its new position, preserving the full path
    setCursor({
      path: appendToPath([...contextPrefix, ...grandparent] as Path, childId, parentId),
      offset: childThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)
