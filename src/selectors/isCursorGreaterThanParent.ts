import State from '../@types/State'
import { compareThought } from '../util/compareThought'
import head from '../util/head'
import parentOf from '../util/parentOf'
import getThoughtById from './getThoughtById'

/**
 * Returns true if the cursor thought's value is greater than its parent's.
 */
const isCursorGreaterThanParent = (state: State): boolean => {
  const { cursor } = state
  if (!cursor) return false

  const cursorHeadId = head(cursor)
  const parentPath = parentOf(cursor)
  const parentHeadId = head(parentPath)

  const cursorThought = getThoughtById(state, cursorHeadId)
  const parentThought = getThoughtById(state, parentHeadId)

  // if either thought is missing, default to false
  if (!cursorThought || !parentThought) return false

  return compareThought(cursorThought, parentThought) > 0
}

export default isCursorGreaterThanParent
