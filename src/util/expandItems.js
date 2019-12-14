import { unrank } from './unrank.js'
import { encodeItems } from './encodeItems.js'
import { contextChainToItemsRanked } from './contextChainToItemsRanked.js'
import { getChildrenWithRank } from './getChildrenWithRank.js'

/** Returns an expansion map marking all items that should be expanded
  * @example {
    A: true,
    A__SEP__A1: true,
    A__SEP__A2: true
  }
*/
export const expandItems = (path, data, contextChildren, contextViews = {}, contextChain = [], depth = 0) => {

  // arbitrarily limit depth to prevent infinite context view expansion (i.e. cycles)
  if (!path || path.length === 0 || depth > 5) return {}

  const itemsRanked = contextChain.length > 0
    ? contextChainToItemsRanked(contextChain)
    : path

  const children = getChildrenWithRank(itemsRanked, data, contextChildren)

  // expand only child
  return (children.length === 1 ? children : []).reduce(
    (accum, child) => {
      const newContextChain = contextChain.map(items => items.concat())
      if (contextChain.length > 0) {
        newContextChain[newContextChain.length - 1].push(child) // eslint-disable-line fp/no-mutating-methods
      }

      return Object.assign({}, accum,
        // RECURSIVE
        // passing contextChain here creates an infinite loop
        expandItems(path.concat(child), data, contextChildren, contextViews, newContextChain, ++depth)
      )
    },
    // expand current item
    {
      [encodeItems(unrank(path))]: true
    }
  )
}
