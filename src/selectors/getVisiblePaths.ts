import { keyValueBy, head } from '../util'
import { Index, State, Path } from '../@types'

/** Generates a map of all visible paths, including the cursor, all its ancestors, and the expanded contexts. */
const getVisiblePaths = (state: State, expandedPaths: Index<Path>): Index<Path> => {
  const { cursor } = state

  // if there is no cursor, decode the url so the cursor can be loaded
  // after loading the ranks will be inferred to update the cursor
  // @MIGRATION_TODO: Change context from url to path.
  // const contextUrl = decodeContextUrl(state, window.location.pathname)
  const cursorPath = cursor || []

  return {
    ...expandedPaths,
    // generate the cursor and all its ancestors
    // i.e. ['a', b', 'c'], ['a', 'b'], ['a']
    ...keyValueBy(cursorPath, (value, i) => {
      // @MIGRATION-TODO: Fix explicit type coversion here
      const subPath = cursorPath.slice(0, cursorPath.length - i) as any as Path
      return subPath.length > 0 ? { [head(subPath)]: subPath } : null
    }),
  }
}

export default getVisiblePaths
