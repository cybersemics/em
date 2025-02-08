import State from '../@types/State'
import ThoughtId from '../@types/ThoughtId'
import Thunk from '../@types/Thunk'
import moveThought from '../actions/moveThought'
import { getChildrenRanked } from '../selectors/getChildren'
import getThoughtById from '../selectors/getThoughtById'
import appendToPath from '../util/appendToPath'
import head from '../util/head'
import parentOf from '../util/parentOf'

/** Swaps the current cursor's thought with its parent by moving nodes. */
const swapParent = (state: State) => {
  const { cursor } = state
  if (!cursor) return state

  const parent = parentOf(cursor)
  if (!parent.length) return state

  const childId = head(cursor)
  const parentId = head(parent)

  const childThought = getThoughtById(state, childId)
  const parentThought = getThoughtById(state, parentId)
  if (!childThought || !parentThought) return state

  // Get children of the child thought that will be moved
  const childChildren = getChildrenRanked(state, childId)

  // First move the child to replace its parent's position
  let stateNew = moveThought(state, {
    oldPath: cursor,
    newPath: parent,
    newRank: parentThought.rank,
  })

  // Then move the parent under the child
  stateNew = moveThought(stateNew, {
    oldPath: parent,
    newPath: appendToPath([childId], parentId),
    newRank: 0,
  })

  // Move all child's children under the parent's new position
  stateNew = childChildren.reduce((accState, childChild) => {
    return moveThought(accState, {
      oldPath: appendToPath(cursor, childChild.id),
      newPath: appendToPath([childId, parentId], childChild.id),
      newRank: childChild.rank,
    })
  }, stateNew)

  // Keep cursor on the child at its new position
  return {
    ...stateNew,
    cursor: [childId] as [ThoughtId, ...ThoughtId[]],
    offset: childThought.value.length,
  }
}

/** Action-creator for swapParent. */
export const swapParentActionCreator = (): Thunk => dispatch => dispatch({ type: 'swapParent' })

export default swapParent
