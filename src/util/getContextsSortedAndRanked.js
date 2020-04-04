import { store } from '../store'

// util
import { getContexts } from './getContexts'
import { makeCompareByProp } from './makeCompareByProp.js'
import { sort } from './sort'

export const getContextsSortedAndRanked = (value, thoughtIndex = store.getState().thoughtIndex) =>
  sort(
    getContexts(value, thoughtIndex),
    // sort
    makeCompareByProp('context')
  )
    // generate dynamic ranks
    .map((thought, i) => ({
      context: thought.context,
      rank: i
    }))
