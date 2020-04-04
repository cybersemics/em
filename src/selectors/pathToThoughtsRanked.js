import {
  lastThoughtsFromContextChain,
  splitChain,
} from '../util'

/** Infers the thoughtsRanked from a cursor that may cross one or more context views */
const cursorToThoughtsRanked = (state, path) => {
  const contextChain = splitChain(path, state.contextViews)
  return lastThoughtsFromContextChain(contextChain)
}

export default cursorToThoughtsRanked
