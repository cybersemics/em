import { contextChainToPath } from './contextChainToPath.js'
import { getThoughts } from './getThoughts.js'
import { hashContext } from './hashContext.js'
import { THOUGHT_ENDS_WITH, RANKED_ROOT } from '../constants'

/** Returns an expansion map marking all thoughts that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
export const expandThoughts = (path, thoughtIndex, contextIndex, contextViews = {}, contextChain = [], depth = 0, checkDefaultExpand = true) => {
  // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
  if (!path || path.length === 0 || depth > 5) return {}

  const thoughtsRanked = contextChain.length > 0
    ? contextChainToPath(contextChain)
    : path

  const children = getThoughts(thoughtsRanked, thoughtIndex, contextIndex)

  let defaultExpand = {} // eslint-disable-line fp/no-let
  if (checkDefaultExpand) {
    /**
     * TODO::
     * Currently passing contest chain blank
     * Needs to debug how context chain is working and what needs to be passed
     */
    const thoughtsExpandedAtColon = getThoughts(RANKED_ROOT, thoughtIndex, contextIndex)
      .filter(child => child.value[child.value.length - 1] === THOUGHT_ENDS_WITH)
      .map(child => expandThoughts([child], thoughtIndex, contextIndex, contextViews, [], 0, false))

    defaultExpand = Object.assign({}, ...thoughtsExpandedAtColon)
  }

  return (children.length === 1 ? children : children.filter(child => child.value[child.value.length - 1] === THOUGHT_ENDS_WITH)).reduce(
    (accum, child) => {
      const newContextChain = contextChain.map(thoughts => thoughts.concat())
      if (contextChain.length > 0) {
        newContextChain[newContextChain.length - 1].push(child) // eslint-disable-line fp/no-mutating-methods
      }

      return Object.assign({}, accum,
        // RECURSIVE
        // passing contextChain here creates an infinite loop
        expandThoughts(path.concat(child), thoughtIndex, contextIndex, contextViews, newContextChain, ++depth, false)
      )
    },
    // expand current thought
    {
      [hashContext(path)]: true,
      ...defaultExpand
    }
  )
}
