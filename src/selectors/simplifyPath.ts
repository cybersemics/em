import lastThoughtsFromContextChain from '../selectors/lastThoughtsFromContextChain'
import splitChain from '../selectors/splitChain'
import isRoot from '../util/isRoot'
import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'

/** Infers the path from a path that may cross one or more context views. */
const simplifyPath = (state: State, path: Path) => {
  if (isRoot(path)) return path as SimplePath
  const contextChain = splitChain(state, path)
  return lastThoughtsFromContextChain(state, contextChain)
}

export default simplifyPath
