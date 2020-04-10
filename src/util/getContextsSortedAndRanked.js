import { store } from '../store'

// util
import { makeCompareByProp } from './makeCompareByProp'
import { sort } from './sort'

// selectors
import { getContexts } from '../selectors'

export const getContextsSortedAndRanked = (value, thoughtIndex = store.getState().thoughtIndex) =>
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
