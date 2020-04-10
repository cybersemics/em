// util
import { makeCompareByProp } from './makeCompareByProp'
import { sort } from './sort'

// selectors
import { getContexts } from '../selectors'

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
