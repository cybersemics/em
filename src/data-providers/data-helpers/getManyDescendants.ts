import State from '../../@types/State'
import ThoughtId from '../../@types/ThoughtId'
import ThoughtIndices from '../../@types/ThoughtIndices'
import { EM_TOKEN } from '../../constants'
import yieldAll from '../../util/yieldAll'
import { DataProvider } from '../DataProvider'
import getDescendantThoughts from './getDescendantThoughts'

/** Gets descendants of many contexts, returning them in a single ThoughtIndices. Does not limit the depth of the em context. */
const getManyDescendants = async function* getManyDescendants(
  provider: DataProvider,
  thoughtIds: ThoughtId[],
  getState: () => State,
  {
    /** See: cancelRef param to getDescendantThoughts. */
    cancelRef,
    /* Maximum number of levels to fetch. */
    maxDepth = 100,
  }: {
    cancelRef?: {
      canceled: boolean
    }
    maxDepth?: number
  } = {},
): AsyncIterable<ThoughtIndices> {
  // fetch descendant thoughts for each context in contextMap
  yield* yieldAll(
    thoughtIds.map(key =>
      getDescendantThoughts(provider, key, getState, {
        cancelRef,
        // do not limit the depth of the em context
        maxDepth: key === EM_TOKEN ? Infinity : maxDepth,
      }),
    ),
  )
}

export default getManyDescendants
