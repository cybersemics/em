import { Child, Context, Path } from '../types'
import { store } from '../store'
import { PartialStateWithThoughts } from '../util/initialState'

// util
import {
  compareByRank,
  hashContext,
  sort,
} from '../util'

// selectors
import { getThought } from '../selectors'

/** Generates children with their ranking. */
// TODO: cache for performance, especially of the app stays read-only
const getThoughtsRanked = (state: PartialStateWithThoughts, context: Context | Path) =>
  sort(
    ((state.thoughts.contextIndex || {})[hashContext(context)] || [])
      .filter((child: Child) => child.value != null && getThought(state, child.value)),
    compareByRank
  )

// useful for debugging
// @ts-ignore
window.getThoughtsRanked = context => getThoughtsRanked(store.getState(), context)

export default getThoughtsRanked
