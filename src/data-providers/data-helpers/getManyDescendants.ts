import State from '../../@types/State'
import ThoughtId from '../../@types/ThoughtId'
import ThoughtsInterface from '../../@types/ThoughtsInterface'
import { EM_TOKEN } from '../../constants'
import yieldAll from '../../util/yieldAll'
import { DataProvider } from '../DataProvider'
import getDescendantThoughts from './getDescendantThoughts'

// hash the EM context once on load
const emContextEncoded = EM_TOKEN

/** Gets descendants of many contexts, returning them in a single ThoughtsInterface. Does not limit the depth of the em context.
 *
 * @param maxDepth    Maximum number of levels to fetch.
 */
const getManyDescendants = async function* getManyDescendants(
  provider: DataProvider,
  thoughtIds: ThoughtId[],
  getState: () => State,
  { maxDepth = 100 } = {},
): AsyncIterable<ThoughtsInterface> {
  // fetch descendant thoughts for each context in contextMap
  yield* yieldAll(
    thoughtIds.map(key =>
      getDescendantThoughts(provider, key, getState, {
        // do not limit the depth of the em context
        maxDepth: key === emContextEncoded ? Infinity : maxDepth,
      }),
    ),
  )
}

export default getManyDescendants
