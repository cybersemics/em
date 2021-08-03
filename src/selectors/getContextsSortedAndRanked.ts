import { makeCompareByProp, sort, unroot } from '../util'
import { getContexts, isAncestorsVisible } from '../selectors'
import { State, ThoughtContext } from '../@types'
import getContextForThought from './getContextForThought'

/** Gets all contexts that the given thought is in, sorted and ranked. */
const getContextsSortedAndRanked = (state: State, value: string): ThoughtContext[] =>
  sort(
    getContexts(state, value).filter(({ id }) => isAncestorsVisible(state, unroot(getContextForThought(state, id)!))),
    // sort
    makeCompareByProp('context'),
  )
    // generate dynamic ranks
    .map((thoughtContext, i) => ({
      ...thoughtContext,
      rank: i,
    }))

export default getContextsSortedAndRanked
