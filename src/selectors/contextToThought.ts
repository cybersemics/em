import { Context, Thought, State } from '../@types'
import { contextToThoughtId, getThoughtById } from '../selectors'

/**
 * Converts a Context to a Thought. Only use in tests.
 */
// TODO: Move to test-helpers
const contextToThought = (state: State, context: Context): Thought | null => {
  const id = contextToThoughtId(state, context)
  return id ? getThoughtById(state, id) : null
}

export default contextToThought
