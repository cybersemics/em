import { DataProvider } from '../DataProvider'
import { hashContext, yieldAll } from '../../util'
import { EM_TOKEN } from '../../constants'
import getDescendantThoughts from './getDescendantThoughts'
import { Context, ContextHash, Index, ThoughtsInterface } from '../../types'

// hash the EM context once on load
const emContextEncoded = hashContext([EM_TOKEN])

/** Gets descendants of many contexts, returning them in a single ThoughtsInterface. Does not limit the depth of the em context.
 *
 * @param maxDepth    Maximum number of levels to fetch.
 */
const getManyDescendants = async function* getManyDescendants(provider: DataProvider, contextMap: Index<Context>, { maxDepth = 100 } = {}): AsyncIterable<ThoughtsInterface> {

  // fetch descendant thoughts for each context in contextMap
  yield* yieldAll((Object.keys(contextMap) as ContextHash[]).map(key =>
    getDescendantThoughts(provider, contextMap[key], {
      // do not limit the depth of the em context
      maxDepth: key === emContextEncoded ? Infinity : maxDepth
    })
  ))
}

export default getManyDescendants
