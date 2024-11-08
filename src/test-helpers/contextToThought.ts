import Context from '../@types/Context'
import State from '../@types/State'
import Thought from '../@types/Thought'
import contextToThoughtId from '../selectors/contextToThoughtId'
import getThoughtById from '../selectors/getThoughtById'

/**
 * Converts a Context to a Thought. If more than one thought has the same value in the same context, traveerses the first.
 */
const contextToThought = (state: State, context: Context): Thought | null => {
  const id = contextToThoughtId(state, context)
  return id ? getThoughtById(state, id) : null
}

export default contextToThought
