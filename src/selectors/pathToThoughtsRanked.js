import {
  splitChain,
} from '../util'

// selectors
import { lastThoughtsFromContextChain } from '../selectors'

/** Infers the thoughtsRanked from a cursor that may cross one or more context views */
const cursorToThoughtsRanked = (state, path) => {
  const contextChain = splitChain(path, state.contextViews)
  return lastThoughtsFromContextChain(state, contextChain)
}

export default cursorToThoughtsRanked
