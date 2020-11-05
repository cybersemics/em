import { makeCompareByProp, sort } from '../util'
import { getContexts } from '../selectors'
import { State } from '../util/initialState'
import { ThoughtContext } from '../types'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): ThoughtContext[] =>
  sort(
    getContexts(state, value),
    // sort
    makeCompareByProp('context')
  )
    // generate dynamic ranks
    .map((thought, i) => ({
      context: thought.context,
      rank: i
    }))

export default getContextsSortedAndRanked
