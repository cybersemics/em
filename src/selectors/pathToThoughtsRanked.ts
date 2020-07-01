import { lastThoughtsFromContextChain, splitChain } from '../selectors'
import { State } from '../util/initialState'
import { Path } from '../types'

/** Infers the thoughtsRanked from a path that may cross one or more context views. */
const pathToThoughtsRanked = (state: State, path: Path) => {
  const contextChain = splitChain(state, path)
  return lastThoughtsFromContextChain(state, contextChain)
}

export default pathToThoughtsRanked
