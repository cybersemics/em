// util
import { makeCompareByProp, sort } from '../util'

// selectors
import { getContexts } from '../selectors'

/** Gets all contexts that the given thought is in, sorted and ranked. */
export default ({ thoughtIndex }, value) =>
  sort(
    getContexts({ thoughtIndex }, value),
    // sort
    makeCompareByProp('context')
  )
    // generate dynamic ranks
    .map((thought, i) => ({
      context: thought.context,
      rank: i
    }))
