import { isContextViewActive } from '../selectors'
import { pathToContext } from '../util'
import { State } from '../util/initialState'
import { Child, Path } from '../types'

/**
 * Splits a path into a contextChain based on contextViews.
 *
 * @example (shown without ranks): splitChain(['A', 'B', 'A'], { B: true }) === [['A', 'B'], ['A']]
 */
const splitChain = (state: State, path: Path) => {

  const contextChain: Child[][] = [[]]

  path.forEach((value, i) => {

    // push thought onto the last component of the context chain
    contextChain[contextChain.length - 1].push(path[i]) // eslint-disable-line fp/no-mutating-methods

    // push an empty array when we encounter a contextView so that the next thought gets pushed onto a new component of the context chain
    const showContexts = isContextViewActive(state, pathToContext(path.slice(0, i + 1)))
    if (showContexts && i < path.length - 1) {
      contextChain.push([]) // eslint-disable-line fp/no-mutating-methods
    }
  })

  return contextChain
}

export default splitChain
