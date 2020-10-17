import { getThought, getThoughts } from '../selectors'
import { compareByRank, pathToContext, sort } from '../util'
import { State } from '../util/initialState'
import { Child, Context, SimplePath } from '../types'

/** Generates children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
const getThoughtsRanked = (state: State, context: Context | SimplePath): Child[] =>
  sort(
    getThoughts(state, pathToContext(context))
      .filter(child => child.value != null && getThought(state, child.value)),
    compareByRank
  )

export default getThoughtsRanked
