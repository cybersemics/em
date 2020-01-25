import { contextChainToPath } from './contextChainToPath.js'
import { getThoughts } from './getThoughts.js'
import { hashContext } from './hashContext.js'
import globals from '../globals.js'
import { contextOf } from './contextOf.js'

import {
  MAX_EXPAND_DEPTH,
  RANKED_ROOT,
  EXPAND_THOUGHT_CHAR,
} from '../constants'

/** Returns an expansion map marking all thoughts that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
export const expandThoughts = (path, thoughtIndex, contextIndex, contextViews = {}, contextChain = [], { depth = 0 } = {}) => {

  // stops expanding when user navigating with arrow key
  if (globals.isMetaKeyDown) return {}

  // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
  if (depth > MAX_EXPAND_DEPTH) return {}

  const thoughtsRanked = !path || path.length === 0 ? RANKED_ROOT
    : contextChain.length > 0 ? contextChainToPath(contextChain)
    : path

  const children = getThoughts(thoughtsRanked, thoughtIndex, contextIndex)

  return (children.length === 1 ? children
    : children.filter(child => child.value[child.value.length - 1] === EXPAND_THOUGHT_CHAR)
  ).reduce(
      (accum, child) => {
        const newContextChain = contextChain.map(thoughts => thoughts.concat())
        if (contextChain.length > 0) {
          newContextChain[newContextChain.length - 1].push(child) // eslint-disable-line fp/no-mutating-methods
        }

        return Object.assign({}, accum,
          // RECURSIVE
          // passing contextChain here creates an infinite loop
          expandThoughts((path || []).concat(child), thoughtIndex, contextIndex, contextViews, newContextChain, { depth: depth + 1 })
        )
      },
      {
        // expand current thought
        [hashContext(path || [])]: true,

        // expand context
        // this allows uncles of the cursor that end in ":" to be expanded
        ...(path && path.length >= 1 && depth === 0
          ? expandThoughts(contextOf(path), thoughtIndex, contextIndex, contextViews, contextChain, { depth: depth + 1 })
          : {})
      }
    )
}
