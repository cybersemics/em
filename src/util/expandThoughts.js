import { contextChainToPath } from './contextChainToPath.js'
import { getThoughts } from './getThoughts.js'
import { hashContext } from './hashContext.js'
import globals from '../globals.js'

/** Returns an expansion map marking all thoughts that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
export const expandThoughts = (path, thoughtIndex, contextIndex, contextViews = {}, contextChain = [], depth = 0) => {

  // stops expanding when user navigating with arrow key
  if (globals.isMetaKeyDown) return {}

  // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
  if (!path || path.length === 0 || depth > 5) return {}

  const thoughtsRanked = contextChain.length > 0
    ? contextChainToPath(contextChain)
    : path

  const children = getThoughts(thoughtsRanked, thoughtIndex, contextIndex)

  // expand only child
  return (children.length === 1 ? children : []).reduce(
    (accum, child) => {
      const newContextChain = contextChain.map(thoughts => thoughts.concat())
      if (contextChain.length > 0) {
        newContextChain[newContextChain.length - 1].push(child) // eslint-disable-line fp/no-mutating-methods
      }

      return Object.assign({}, accum,
        // RECURSIVE
        // passing contextChain here creates an infinite loop
        expandThoughts(path.concat(child), thoughtIndex, contextIndex, contextViews, newContextChain, ++depth)
      )
    },
    // expand current thought
    {
      [hashContext(path)]: true
    }
  )
}
