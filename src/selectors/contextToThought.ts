import { Context, Thought, State } from '../@types'
import { contextToThoughtId, getThoughtById } from '../selectors'

/**
 * Gets the head Thought of a context.
 */
const contextToThought = (state: State, context: Context): Thought | null => {
  const id = contextToThoughtId(state, context)
  return id ? getThoughtById(state, id) : null
}

export default contextToThought
