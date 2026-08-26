import State from '../@types/State'
import { compareThought } from '../util/compareThought'
import parentOf from '../util/parentOf'
import contextThoughtId from './contextThoughtId'
import getThoughtById from './getThoughtById'

/**
 * Returns true if the cursor thought's value is greater than its parent's.
 */
const isCursorGreaterThanParent = (state: State): boolean => {
  const { cursor } = state
  if (!cursor) return false

  // compare the thoughts the user sees, which in the context view are the contexts rather than the Lexeme instances
  const cursorThought = getThoughtById(state, contextThoughtId(state, cursor))
  const parentThought = cursor.length > 1 ? getThoughtById(state, contextThoughtId(state, parentOf(cursor))) : undefined

  // if either thought is missing, default to false
  if (!cursorThought || !parentThought) return false

  return compareThought(cursorThought, parentThought) > 0
}

export default isCursorGreaterThanParent
