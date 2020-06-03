import { Child, Context, Path } from '../types'
import { store } from '../store'
import { PartialStateWithThoughts } from '../util/initialState'
import { getThought } from '../selectors'
import { compareByRank, hashContext, pathToContext, sort } from '../util'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
const getThoughtsRanked = (state: PartialStateWithThoughts, context: Context | Path) =>
  sort(
    ((state.thoughts.contextIndex || {})[hashContext(pathToContext(context))] || [])
      .filter((child: Child) => child.value != null && getThought(state, child.value)),
    compareByRank
  )

// useful for debugging
// @ts-ignore
window.getThoughtsRanked = context => getThoughtsRanked(store.getState(), context)

export default getThoughtsRanked
