import { HOME_PATH, HOME_TOKEN } from '../constants'
import {
  appendToPath,
  contextChainToPath,
  createId,
  equalArrays,
  equalThoughtRanked,
  head,
  headValue,
  isRoot,
  pathToContext,
  unroot,
} from '../util'
import {
  getContexts,
  getContextsSortedAndRanked,
  getLexeme,
  getChildrenRanked,
  isContextViewActive,
  splitChain,
} from '../selectors'
import { Child, Context, Path, State } from '../@types'
import getRootPath from './getRootPath'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first
// NOTE: path is pathToContexted
const rankThoughtsFirstMatch = (state: State, pathUnranked: string[]): Path => {
  if (isRoot(pathUnranked)) return getRootPath(state)

  let pathResult: Path = HOME_PATH // eslint-disable-line fp/no-let
  let prevParentContext = [HOME_TOKEN] // eslint-disable-line fp/no-let

  return pathUnranked.map((value, i) => {
    const lexeme = getLexeme(state, value)
    const contextPathUnranked = i === 0 ? [HOME_TOKEN] : pathUnranked.slice(0, i)
    const contextChain = splitChain(state, pathResult)
    const path = contextChainToPath(contextChain)
    const context = unroot(prevParentContext).concat(headValue(path)) as Context
    const inContextView = i > 0 && isContextViewActive(state, contextPathUnranked)
    const contexts = (inContextView ? getContextsSortedAndRanked : getContexts)(
      state,
      inContextView ? head(contextPathUnranked) : value,
    )

    const parents = inContextView
      ? contexts.filter(child => head(child.context) === value)
      : ((lexeme && lexeme.contexts) || []).filter(p => equalArrays(p.context, context))

    const contextThoughts = parents.length > 1 ? getChildrenRanked(state, pathToContext(path)) : []

    // there may be duplicate parents that are missing from contextIndex
    // in this case, find the matching thought
    const parent =
      parents.length <= 1
        ? parents[0]
        : parents.find(parent =>
            contextThoughts.some((child: Child) =>
              equalThoughtRanked(child, {
                id: createId(),
                value,
                rank: parent.rank,
              }),
            ),
          )

    if (parent && parent.context) {
      prevParentContext = parent.context
    }

    const thoughtRanked = {
      value,
      // NOTE: we cannot throw an error if there is no parent, as it may be a floating context
      // unfortunately this that there is no protection against a (incorrectly) missing parent
      rank: parent?.rank ?? 0,
      id: parent?.id || '',
    }

    pathResult = appendToPath(pathResult, thoughtRanked)

    return thoughtRanked
  }) as Path
}

export default rankThoughtsFirstMatch
