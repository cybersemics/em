// selectors
import { lastThoughtsFromContextChain, splitChain } from '../selectors'

/** Infers the thoughtsRanked from a path that may cross one or more context views. */
const pathToThoughtsRanked = (state, path) => {
  const contextChain = splitChain(state, path)
  return lastThoughtsFromContextChain(state, contextChain)
}

export default pathToThoughtsRanked
