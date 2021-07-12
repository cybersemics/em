import { lastThoughtsFromContextChain, splitChain } from '../selectors'
import { isRoot } from '../util'
import { Path, SimplePath, State } from '../types'

/** Infers the path from a path that may cross one or more context views. */
const simplifyPath = (state: State, path: Path) => {
  if (isRoot(path)) return path as SimplePath
  const contextChain = splitChain(state, path)
  return lastThoughtsFromContextChain(state, contextChain)
}

export default simplifyPath
