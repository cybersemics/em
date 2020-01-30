import { contextChainToPath } from './contextChainToPath.js'
import { contextOf } from './contextOf.js'
import { getThoughtsRanked } from './getThoughtsRanked.js'
import { hashContext } from './hashContext.js'
import { pathToContext } from './pathToContext.js'

import {
  MAX_EXPAND_DEPTH,
  RANKED_ROOT,
  EXPAND_THOUGHT_CHAR,
} from '../constants'
import { isURL } from '../util.js'

/** Returns an expansion map marking all thoughts that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
export const expandThoughts = (path, thoughtIndex, contextIndex, contexts, contextViews = {}, contextChain = [], { depth = 0 } = {}) => {

  // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
  if (depth > MAX_EXPAND_DEPTH) return {}

  const thoughtsRanked = !path || path.length === 0 ? RANKED_ROOT
    : contextChain.length > 0 ? contextChainToPath(contextChain)
    : path

  const children = getThoughtsRanked(thoughtsRanked, thoughtIndex, contextIndex)

  // expand if child is only child and its child is not url
  const subChildren = children.length === 1
    ? getThoughtsRanked(path.concat(children[0]), thoughtIndex, contextIndex)
    : null
  const isOnlyChildUrl = subChildren
    && subChildren.length === 1
    && !isURL(subChildren[0].value
  )
  const encoded = hashContext(pathToContext(thoughtsRanked))

  return (isOnlyChildUrl || (contexts[encoded] && contexts[encoded].view === 'table')
    ? children
    : children.filter(child => child.value[child.value.length - 1] === EXPAND_THOUGHT_CHAR)
  ).reduce(
    (accum, child) => {
      const newContextChain = (contextChain || [])
        .map(thoughts => thoughts.concat())
        .concat(contextChain.length > 0 ? child : [])

        return Object.assign({}, accum,
          // RECURSIVE
          // passing contextChain here creates an infinite loop
          expandThoughts((path || []).concat(child), thoughtIndex, contextIndex, contexts, contextViews, newContextChain, { depth: depth + 1 })
        )
      },
      {
        // expand current thought
        [hashContext(path || [])]: true,

        // expand context
        // this allows uncles of the cursor that end in ":" to be expanded
        // RECURSION
        ...(path && path.length >= 1 && depth === 0
          ? expandThoughts(contextOf(path), thoughtIndex, contextIndex, contexts, contextViews, contextChain, { depth: depth + 1 })
          : {})
      }
    )
}
