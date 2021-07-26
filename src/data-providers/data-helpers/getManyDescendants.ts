import { DataProvider } from '../DataProvider'
import { yieldAll } from '../../util'
import { EM_TOKEN } from '../../constants'
import getDescendantThoughts from './getDescendantThoughts'
import { State, Context, ContextHash, Index, ThoughtsInterface } from '../../@types'

// hash the EM context once on load
const emContextEncoded = EM_TOKEN

/** Gets descendants of many contexts, returning them in a single ThoughtsInterface. Does not limit the depth of the em context.
 *
 * @param maxDepth    Maximum number of levels to fetch.
 */
const getManyDescendants = async function* getManyDescendants(
  provider: DataProvider,
  contextMap: Index<Context>,
  // @MIGRATION_TODO: Remove state dependency here after migration is complete
  state: State,
  { maxDepth = 100 } = {},
): AsyncIterable<ThoughtsInterface> {
  // fetch descendant thoughts for each context in contextMap
  yield* yieldAll(
    (Object.keys(contextMap) as ContextHash[]).map(key =>
      getDescendantThoughts(provider, contextMap[key], state, {
        // do not limit the depth of the em context
        maxDepth: key === emContextEncoded ? Infinity : maxDepth,
      }),
    ),
  )
}

export default getManyDescendants
