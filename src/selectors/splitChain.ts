import { isContextViewActive, getContexts, rankThoughtsFirstMatch } from '../selectors'
import { pathToContext } from '../util'
import { State } from '../util/initialState'
import { Path, SimplePath } from '../types'

/**
 * Splits a path into a contextChain based on contextViews.
 *
 * @example (shown without ranks): splitChain(['A', 'B', 'A'], { B: true }) === [['A', 'B'], ['A']]
 */
const splitChain = (state: State, path: Path): SimplePath[] => {

  const contextChain: SimplePath[] = [[] as unknown as SimplePath]

  path.forEach((value, i) => {

    // push thought onto the last component of the context chain
    contextChain[contextChain.length - 1].push(path[i]) // eslint-disable-line fp/no-mutating-methods

    // push an empty array when we encounter a contextView so that the next thought gets pushed onto a new component of the context chain
    // or if crossing context view boundary, push the SimplePath of the context
    const showContexts = isContextViewActive(state, pathToContext(path.slice(0, i + 1)))
    if (showContexts && i < path.length - 1) {

      const contexts = i > 0 ? getContexts(state, path[i + 1].value) : []
      const matchingContext = contexts.find(cx => cx.id === path[i + 1].id)

      // NOTE: rankThoughtsFirstMatch will call splitChain, creating indirect recursion
      // Since we are only passing a SimplePath to rankThoughtsFirstMatch, it will not create an infinite loop (hopefully)

      // eslint-disable-next-line fp/no-mutating-methods
      contextChain.push((matchingContext
        ? rankThoughtsFirstMatch(state, matchingContext.context.slice(0, -1))
        : []
      ) as SimplePath)
    }
  })

  return contextChain
}

export default splitChain
