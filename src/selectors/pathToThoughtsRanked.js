// selectors
import { lastThoughtsFromContextChain, splitChain } from '../selectors'

/** Infers the thoughtsRanked from a cursor that may cross one or more context views */
const cursorToThoughtsRanked = (state, path) => {
  const contextChain = splitChain(state, path)
  return lastThoughtsFromContextChain(state, contextChain)
}

export default cursorToThoughtsRanked
