import { makeCompareByProp, sort, unroot } from '../util'
import { getContexts, isAncestorsVisible } from '../selectors'
import { State } from '../util/initialState'
import { ThoughtContext } from '../types'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): ThoughtContext[] =>
  sort(
    getContexts(state, value).filter(({ context }) => isAncestorsVisible(state, unroot(context.concat(value)))),
    // sort
    makeCompareByProp('context'),
  )
    // generate dynamic ranks
    .map((thoughtContext, i) => ({
      ...thoughtContext,
      rank: i,
    }))

export default getContextsSortedAndRanked
