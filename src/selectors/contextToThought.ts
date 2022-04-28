import { Context, Thought, State } from '../@types'
import { getThoughtIdByContext } from '../util'
import { getThoughtById } from '../selectors'

/**
 * Gets the head Thought of a context.
 */
const contextToThought = (state: State, context: Context): Thought | null => {
  const id = getThoughtIdByContext(state, context)
  return id ? getThoughtById(state, id) : null
}

export default contextToThought
