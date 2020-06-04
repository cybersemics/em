import { store } from '../store'
import { Child, Context, Path } from '../types'
import { State } from '../util/initialState'
import { getThought, getThoughts } from '../selectors'
import { compareByRank, pathToContext, sort } from '../util'

/** Generates children of a context with their ranking. */
const getThoughtsRanked = (state: State, context: Context | Path) =>
  sort(
    getThoughts(state, pathToContext(context))
      .filter((child: Child) => child.value != null && getThought(state, child.value)),
    compareByRank
  )

// useful for debugging
// @ts-ignore
window.getThoughtsRanked = context => getThoughtsRanked(store.getState(), context)

export default getThoughtsRanked
