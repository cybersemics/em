import { Context, Thought, State } from '../@types'
import { contextToThoughtId, getThoughtById } from '../selectors'

/**
 * Converts a Context to a Thought. If more than one thought has the same value in the same context, traveerses the first.
 */
const contextToThought = (state: State, context: Context): Thought | null => {
  const id = contextToThoughtId(state, context)
  return id ? getThoughtById(state, id) : null
}

export default contextToThought
