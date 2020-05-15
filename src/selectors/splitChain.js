// util
import { isContextViewActive } from '../selectors'

/**
 * Splits a path into a contextChain based on contextViews.
 *
 * @example (shown without ranks): splitChain(['A', 'B', 'A'], { B: true }) === [['A', 'B'], ['A']]
 */
export default (state, path) => {

  const contextChain = [[]]

  path.forEach((value, i) => {

    // push thought onto the last component of the context chain
    contextChain[contextChain.length - 1].push(path[i]) // eslint-disable-line fp/no-mutating-methods

    // push an empty array when we encounter a contextView so that the next thought gets pushed onto a new component of the context chain
    const showContexts = isContextViewActive(state, path.slice(0, i + 1))
    if (showContexts && i < path.length - 1) {
      contextChain.push([]) // eslint-disable-line fp/no-mutating-methods
    }
  })

  return contextChain
}
