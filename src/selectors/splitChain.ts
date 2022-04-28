import { isContextViewActive, getContexts, contextToPath } from '../selectors'
import { pathToContext } from '../util'
import { Path, SimplePath, State } from '../@types'
import getContextForThought from './getContextForThought'
import childIdsToThoughts from './childIdsToThoughts'

/**
 * Splits a path into a contextChain based on contextViews.
 *
 * @example (shown without ranks): splitChain(['A', 'B', 'A'], { B: true }) === [['A', 'B'], ['A']]
 */
const splitChain = (state: State, path: Path): SimplePath[] => {
  const contextChain: SimplePath[] = [[] as unknown as SimplePath]

  const pathThoughtsArray = childIdsToThoughts(state, path) ?? []

  pathThoughtsArray.forEach((value, i) => {
    // push thought onto the last component of the context chain
    contextChain[contextChain.length - 1].push(path[i]) // eslint-disable-line fp/no-mutating-methods

    // push an empty array when we encounter a contextView so that the next thought gets pushed onto a new component of the context chain
    // or if crossing context view boundary, push the SimplePath of the context
    const showContexts = isContextViewActive(state, pathToContext(state, path.slice(0, i + 1) as Path))
    if (showContexts && i < path.length - 1) {
      const contexts = (i > 0 && childIdsToThoughts(state, getContexts(state, pathThoughtsArray[i + 1].value))) || []
      const matchingContext = contexts.find(cx => cx.id === pathThoughtsArray[i + 1].id)

      const context = matchingContext && getContextForThought(state, matchingContext.id)
      // NOTE: contextToPath will call splitChain, creating indirect recursion
      // Since we are only passing a SimplePath to contextToPath, it will not create an infinite loop (hopefully)

      // eslint-disable-next-line fp/no-mutating-methods
      contextChain.push((context ? contextToPath(state, context.slice(0, -1)) : []) as SimplePath)
    }
  })

  return contextChain
}

export default splitChain
