import State from '../@types/State'
import { compareThought } from '../util/compareThought'
import parentOf from '../util/parentOf'
import getThoughtById from './getThoughtById'
import parentContextId from './parentContextId'

/**
 * Returns true if the cursor thought's value is greater than its parent's.
 */
const isCursorGreaterThanParent = (state: State): boolean => {
  const { cursor } = state
  if (!cursor) return false

  // compare the thoughts the user sees, which in the context view are the contexts rather than the Lexeme contexts
  const cursorThought = getThoughtById(state, parentContextId(state, cursor))
  const parentThought = cursor.length > 1 ? getThoughtById(state, parentContextId(state, parentOf(cursor))) : undefined

  // if either thought is missing, default to false
  if (!cursorThought || !parentThought) return false

  return compareThought(cursorThought, parentThought) > 0
}

export default isCursorGreaterThanParent
