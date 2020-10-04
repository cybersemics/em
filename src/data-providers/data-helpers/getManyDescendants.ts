import { DataProvider } from '../DataProvider'
import { Context } from '../../types'
import { GenericObject } from '../../utilTypes'
import { ThoughtsInterface } from '../../util/initialState'
import { hashContext, pathToContext, yieldAll } from '../../util'
import { EM_TOKEN } from '../../constants'
import getDescendantThoughts from './getDescendantThoughts'

// hash the EM context once on load
const emContextEncoded = hashContext([EM_TOKEN])

/** Gets descendants of many contexts, returning them in a single ThoughtsInterface. Does not limit the depth of the em context.
 *
 * @param maxDepth    Maximum number of levels to fetch.
 */
const getManyDescendants = async function* getManyDescendants(provider: DataProvider, contextMap: GenericObject<Context>, { maxDepth = 100 } = {}): AsyncIterable<ThoughtsInterface> {

  // fetch descendant thoughts for each context in contextMap
  yield* yieldAll(Object.keys(contextMap).map((key: string) =>
    getDescendantThoughts(provider, pathToContext(contextMap[key]), {
      // do not limit the depth of the em context
      maxDepth: key === emContextEncoded ? Infinity : maxDepth
    })
  ))
}

export default getManyDescendants
