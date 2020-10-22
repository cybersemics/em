import { getThought, getThoughts } from '../selectors'
import { compareByRank, sort } from '../util'
import { State } from '../util/initialState'
import { Child, Context } from '../types'

/** Generates children of a context sorted by their ranking. Returns a new object reference even if the children have not changed. */
const getThoughtsRanked = (state: State, context: Context): Child[] => {
  return sort(
    getThoughts(state, context)
      .filter(child => getThought(state, child.value)),
    compareByRank
  )
}

export default getThoughtsRanked
