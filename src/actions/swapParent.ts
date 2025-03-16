import _ from 'lodash'
import State from '../@types/State'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
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

  // Get the grandparent path (parent of parent)
  const grandparent = parentOf(parent)

  // Get siblings (other children of parent excluding the child being swapped)
  const parentChildren = getChildrenRanked(state, parentId)
  const siblings = parentChildren.filter(sibling => sibling.id !== childId)

  return reducerFlow([
    // First move the child to replace its parent's position
    state =>
      moveThought(state, {
        oldPath: cursor,
        newPath: parent,
        newRank: parentThought.rank,
      }),

    // Then move the parent under the child
    state =>
      moveThought(state, {
        oldPath: parent,
        newPath: appendToPath([childId], parentId),
        newRank: 0,
      }),

    // Move only the grandchildren under the parent's new position
    state =>
      childChildren.reduce((accState, grandchild) => {
        return moveThought(accState, {
          oldPath: appendToPath(cursor, grandchild.id),
          newPath: appendToPath([...grandparent, childId, parentId], grandchild.id),
          newRank: grandchild.rank,
        })
      }, state),

    // Keep siblings under their original parent
    state =>
      siblings.reduce((accState, sibling) => {
        return moveThought(accState, {
          oldPath: appendToPath(parent, sibling.id),
          newPath: appendToPath([...grandparent, childId], sibling.id),
          newRank: sibling.rank,
        })
      }, state),

    // Keep cursor on the child at its new position, preserving the full path
    setCursor({
      path: appendToPath(grandparent, childId, parentId),
      offset: childThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)
