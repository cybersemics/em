import { makeCompareByProp, sort } from '../util'
import { getContexts, isContextVisibleForUser } from '../selectors'
import { State } from '../util/initialState'
import { ThoughtContext } from '../types'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): ThoughtContext[] =>
  sort(
    getContexts(state, value).filter(({ context }) => isContextVisibleForUser(state, context.concat(value))),
    // sort
    makeCompareByProp('context')
  )
    // generate dynamic ranks
    .map((thought, i) => ({
      ...thought,
      rank: i,
    }))

export default getContextsSortedAndRanked
