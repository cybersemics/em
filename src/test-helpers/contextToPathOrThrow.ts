import Path from '../@types/Path'
import SimplePath from '../@types/SimplePath'
import State from '../@types/State'
import contextToPath from '../selectors/contextToPath'
import simplifyPath from '../selectors/simplifyPath'

/**
 * Resolves an unranked path to a SimplePath for a test helper, throwing if it does not resolve.
 *
 * A test helper must never pass the null from `contextToPath` through to a reducer. Doing so turns a mis-specified
 * fixture path into a test that passes against an untouched tree, because a null cursor makes cursor-dependent
 * reducers early-return. The caller supplies its own name so that the error identifies the helper as well as the path.
 */
const contextToPathOrThrow = (state: State, pathUnranked: string[], helperName: string): Path => {
  const path = contextToPath(state, pathUnranked)

  if (!path) {
    throw new Error(
      `${helperName}: could not resolve the context ${JSON.stringify(pathUnranked)}. Check that the fixture contains this thought, and that any context view the path crosses is already active.`,
    )
  }

  return path
}

/**
 * Resolves an unranked path to a SimplePath, throwing if it does not resolve.
 *
 * Use where a reducer or selector requires a SimplePath. If the context crosses an active context view, the result is
 * the Lexeme instance's real position in the tree, e.g. ['a', 'm', 'b'] with the context view active on a/m resolves
 * to b/m.
 */
export const contextToSimplePath = (state: State, pathUnranked: string[], helperName: string): SimplePath =>
  simplifyPath(state, contextToPathOrThrow(state, pathUnranked, helperName))

export default contextToPathOrThrow
