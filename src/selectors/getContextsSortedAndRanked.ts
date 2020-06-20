import { makeCompareByProp, sort } from '../util'
import { getContexts } from '../selectors'
import { State } from '../util/initialState'

/** Gets all contexts that the given thought is in, sorted and ranked. */
export default (state: State, value: string) =>
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
