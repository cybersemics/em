import { pathToContext, keyValueBy, hashContext } from '../util'
import { decodeContextUrl } from '../selectors'
import { Index, Context } from '../types'
import { State } from '../util/initialState'

/** Generates a map of all visible contexts, including the cursor, all its ancestors, and the expanded contexts. */
const getVisibleContexts = (state: State, expandedContexts: Index<Context>): Index<Context> => {
  const { cursor } = state

  // if there is no cursor, decode the url so the cursor can be loaded
  // after loading the ranks will be inferred to update the cursor
  const contextUrl = decodeContextUrl(state, window.location.pathname)
  const contextCursor = cursor ? pathToContext(cursor) : contextUrl

  return {
    ...expandedContexts,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(contextCursor, (value, i) => {
      const subcontext = contextCursor.slice(0, contextCursor.length - i)
      return subcontext.length > 0 ? { [hashContext(subcontext)]: subcontext } : null
    }),
  }
}

export default getVisibleContexts
