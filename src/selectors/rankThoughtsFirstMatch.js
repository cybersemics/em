// constants
import {
  RANKED_ROOT,
  ROOT_TOKEN,
} from '../constants'

// util
import {
  contextChainToPath,
  equalArrays,
  equalThoughtRanked,
  head,
  headValue,
  isRoot,
  unroot,
} from '../util'

// selectors
import {
  getContexts,
  getContextsSortedAndRanked,
  getThought,
  getThoughtsRanked,
  isContextViewActive,
  splitChain,
} from '../selectors'

/** Ranks the thoughts from their rank in their context. */
// if there is a duplicate thought in the same context, takes the first
// NOTE: path is pathToContexted
export default (state, pathUnranked) => {
  if (isRoot(pathUnranked)) return RANKED_ROOT

  let thoughtsRankedResult = RANKED_ROOT // eslint-disable-line fp/no-let
  let prevParentContext = [ROOT_TOKEN] // eslint-disable-line fp/no-let

  return pathUnranked.map((value, i) => {
    const thought = getThought(state, value)
    const contextPathUnranked = i === 0 ? [ROOT_TOKEN] : pathUnranked.slice(0, i)
    const contextChain = splitChain(state, thoughtsRankedResult)
    const thoughtsRanked = contextChainToPath(contextChain)
    const context = unroot(prevParentContext).concat(headValue(thoughtsRanked))
    const inContextView = i > 0 && isContextViewActive(state, contextPathUnranked)
    const contexts = (inContextView ? getContextsSortedAndRanked : getContexts)(
      state,
      inContextView
        ? head(contextPathUnranked)
        : value
    )

    const parents = inContextView
      ? contexts.filter(child => head(child.context) === value)
      : ((thought && thought.contexts) || []).filter(p => equalArrays(p.context, context))

    const contextThoughts = parents.length > 1 && getThoughtsRanked(state, thoughtsRankedResult)

    // there may be duplicate parents that are missing from contextIndex
    // in this case, find the matching thought
    const parent = parents.length <= 1
      ? parents[0]
      : parents.find(parent => contextThoughts.some(thoughtRanked => equalThoughtRanked(
        thoughtRanked,
        {
          value,
          rank: parent.rank
        }
      )))

    if (parent && parent.context) {
      prevParentContext = parent.context
    }

    const thoughtRanked = {
      value,
      // NOTE: we cannot throw an error if there is no parent, as it may be a floating context
      // unfortunately this that there is no protection against a (incorrectly) missing parent
      rank: parent ? parent.rank : 0,
    }

    thoughtsRankedResult = unroot(thoughtsRankedResult.concat(thoughtRanked))

    return thoughtRanked
  })
}
