import _ from 'lodash'
import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'
import reducerFlow from '../util/reducerFlow'

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

  // Get children of the child thought that will be moved
  const childChildren = getChildrenRanked(state, childId).filter(child => {
    return child.rank < parentThought.rank
  })

  // Get the grandparent path (parent of parent)
  const grandparent = parentOf(parent)

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

    // Move all child's children under the parent's new position
    state =>
      childChildren.reduce((accState, childChild) => {
        return moveThought(accState, {
          oldPath: appendToPath(cursor, childChild.id),
          newPath: appendToPath([...grandparent, childId, parentId], childChild.id),
          newRank: childChild.rank,
        })
      }, state),

    // Keep cursor on the child at its new position, preserving the full path
    state => ({
      ...state,
      cursor: [...grandparent, childId, parentId] as [ThoughtId, ...ThoughtId[]],
      offset: childThought.value.length,
    }),
  ])(state)
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default _.curryRight(swapParent)
